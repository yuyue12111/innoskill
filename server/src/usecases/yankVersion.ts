import { assertPathOwner } from "../domain/accessControl.js";
import { notFound } from "../domain/errors.js";
import type { Requester, SkillVersion } from "../domain/model.js";
import type { Deps } from "./deps.js";

/** 版本下架(03 §7):动作不可撤销;下架的若是 headline,回退到最近发布且未下架的版本 */
export async function yankVersion(
  deps: Pick<Deps, "db" | "clock">,
  input: { requester: Requester; userId: string; slug: string; version: string },
): Promise<SkillVersion> {
  assertPathOwner(input.requester, input.userId);
  const skill = await deps.db.skills.findByUserAndSlug(input.userId, input.slug);
  if (!skill) throw notFound(`技能不存在：${input.userId}/${input.slug}`);
  const version = await deps.db.versions.findBySkillAndVersion(skill.id, input.version);
  if (!version) throw notFound(`版本不存在：${input.userId}/${input.slug}@${input.version}`);
  if (version.status === "YANKED") return version;

  return deps.db.transaction(async (repos) => {
    const yanked = await repos.versions.update(version.id, { status: "YANKED", yankedAt: deps.clock.now() });
    if (skill.latestVersionId === version.id) {
      const fallback = await repos.versions.findLatestDownloadable(skill.id);
      await repos.skills.update(skill.id, { latestVersionId: fallback?.id ?? null });
    }
    return yanked;
  });
}
