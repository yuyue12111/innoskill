import { canView, checkDownload, shouldRedirect } from "../domain/accessControl.js";
import { appError, badRequest, forbidden, notFound } from "../domain/errors.js";
import { bundleKey, type Requester } from "../domain/model.js";
import { buildBundle } from "../domain/packageParser.js";
import type { Deps } from "./deps.js";

export const PRESIGN_SECONDS = 600;

export type DownloadResult =
  | { kind: "redirect"; url: string }
  | { kind: "stream"; body: ReadableStream<Uint8Array>; size: number | null; filename: string }
  | { kind: "bytes"; body: Uint8Array; filename: string };

export interface DownloadInput {
  requester: Requester;
  userId: string;
  slug: string;
  version: string;
  isSecure: boolean;
}

/** 按确切版本号下载(03 §6) */
export async function downloadVersion(
  deps: Pick<Deps, "db" | "storage">,
  input: DownloadInput,
): Promise<DownloadResult> {
  const skill = await deps.db.skills.findByUserAndSlug(input.userId, input.slug);
  if (!skill) throw notFound(`技能不存在：${input.userId}/${input.slug}`);
  // 先判技能可见性,看不见的技能不暴露它有哪些版本
  if (!canView(skill, input.requester)) throw forbidden();
  const version = await deps.db.versions.findBySkillAndVersion(skill.id, input.version);
  if (!version) throw notFound(`版本不存在：${input.userId}/${input.slug}@${input.version}`);
  if (checkDownload(skill, version, input.requester) !== "ALLOW") {
    throw badRequest(`该版本不可下载：${input.version}`);
  }

  const key = bundleKey(skill.id, version.id);
  const bundleExists = await deps.storage.exists(key);

  // 计数在字节流出去之前完成,两处 +1 同一事务;302 未下载、中途断开都会计数(03 §6.5)
  await deps.db.transaction(async (repos) => {
    await repos.skills.incrementDownloadCount(skill.id);
    await repos.stats.increment(skill.id, version.id);
  });

  const filename = `${skill.slug}-${version.version}.zip`;
  if (shouldRedirect(input.isSecure, bundleExists)) {
    return { kind: "redirect", url: await deps.storage.presignGet(key, PRESIGN_SECONDS, filename) };
  }
  if (bundleExists) {
    const object = await deps.storage.getStream(key);
    if (object) return { kind: "stream", body: object.body, size: object.size, filename };
  }

  // 降级路径:整包丢失时按登记条现打,不写回(03 §6.6)
  const files = await deps.db.files.listByVersion(version.id);
  const fetched = await Promise.all(
    files.map(async (f) => ({ path: f.filePath, bytes: await deps.storage.getBytes(f.storageKey) })),
  );
  const present = fetched.flatMap((f) => (f.bytes ? [{ path: f.path, bytes: f.bytes }] : []));
  if (present.length === 0) throw appError("INTERNAL", "存储中缺少该版本的文件");
  return { kind: "bytes", body: buildBundle(present), filename };
}
