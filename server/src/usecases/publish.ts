import { badRequest, unauthorized } from "../domain/errors.js";
import { bundleKey, fileKey, type Requester, type Skill, type SkillVersion, type Visibility } from "../domain/model.js";
import { buildBundle, parsePackage, type Warning } from "../domain/packageParser.js";
import { parseSkillMd, resolveVersion, slugFromName } from "../domain/skillMdParser.js";
import type { VersionData } from "../ports/repositories.js";
import type { Deps } from "./deps.js";

export interface PublishInput {
  requester: Requester;
  zip: Uint8Array;
  visibility: Visibility;
  confirmWarnings: boolean;
}

export interface PublishResult {
  skill: Skill;
  version: SkillVersion;
  warnings: Warning[];
}

/** 上传即发布(03 §3) */
export async function publishSkill(
  deps: Pick<Deps, "db" | "storage" | "searchIndex" | "clock" | "logger">,
  input: PublishInput,
): Promise<PublishResult> {
  const { requester } = input;
  if (!requester) throw unauthorized();

  const pkg = parsePackage(input.zip);
  if (pkg.warnings.length > 0 && !input.confirmWarnings) {
    throw badRequest("package has warnings; resubmit with confirmWarnings=true to publish anyway", {
      warnings: pkg.warnings,
    });
  }

  const skillMd = pkg.files.find((f) => f.path === "SKILL.md");
  if (!skillMd) throw badRequest("SKILL.md not found at package root");
  const meta = parseSkillMd(new TextDecoder().decode(skillMd.bytes));
  const slug = slugFromName(meta.name);
  const now = deps.clock.now();
  const versionName = resolveVersion(meta.version, now);
  const bundle = buildBundle(pkg.files);

  const versionData: VersionData = {
    status: "PUBLISHED",
    requestedVisibility: input.visibility,
    parsedMetadata: meta.raw,
    manifest: pkg.files.map((f) => ({ path: f.path, size: f.bytes.length, contentType: f.contentType })),
    fileCount: pkg.files.length,
    totalSize: pkg.totalSize,
    bundleReady: true,
    downloadReady: true,
    publishedAt: now,
    yankedAt: null,
  };

  // 事务边界:findOrCreate 到写完 bundle。对象存储不参与事务,写失败则数据库回滚(03 §3.5)
  const result = await deps.db.transaction(async (repos) => {
    const skill =
      (await repos.skills.findByUserAndSlug(requester.userId, slug)) ??
      (await repos.skills.create({
        userId: requester.userId,
        slug,
        skillName: meta.name,
        summary: meta.description,
        visibility: input.visibility,
      }));

    const existing = await repos.versions.findBySkillAndVersion(skill.id, versionName);
    let version: SkillVersion;
    if (existing) {
      if (existing.status !== "YANKED") throw badRequest(`version already exists: ${versionName}`);
      // 已下架的版本号可复用:删旧登记与对象后重建(04 §4.2)
      const oldFiles = await repos.files.listByVersion(existing.id);
      await repos.files.deleteByVersion(existing.id);
      await deps.storage.deleteMany([...oldFiles.map((f) => f.storageKey), bundleKey(skill.id, existing.id)]);
      version = await repos.versions.update(existing.id, versionData);
    } else {
      version = await repos.versions.create({ skillId: skill.id, version: versionName, ...versionData });
    }

    await repos.files.createMany(
      pkg.files.map((f) => ({
        versionId: version.id,
        filePath: f.path,
        fileSize: f.bytes.length,
        contentType: f.contentType,
        sha256: f.sha256,
        storageKey: fileKey(skill.id, version.id, f.path),
      })),
    );
    const updated = await repos.skills.update(skill.id, {
      skillName: meta.name,
      summary: meta.description,
      visibility: input.visibility,
      latestVersionId: version.id,
    });

    await Promise.all(
      pkg.files.map((f) => deps.storage.put(fileKey(skill.id, version.id, f.path), f.bytes, f.contentType)),
    );
    await deps.storage.put(bundleKey(skill.id, version.id), bundle, "application/zip");
    return { skill: updated, version };
  });

  // 提交后异步重建索引:返回 201 不代表立刻能搜到(03 §3.1)
  deps.searchIndex
    .upsert(result.skill.id)
    .catch((err: unknown) => deps.logger.error({ err, skillId: result.skill.id }, "search index upsert failed"));

  return { ...result, warnings: pkg.warnings };
}
