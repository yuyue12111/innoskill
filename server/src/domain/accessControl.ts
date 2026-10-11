// 授权模型只有「是否为作者」,没有平台角色(03 §6.3)。

import { forbidden, unauthorized } from "./errors.js";
import type { Requester, Skill, SkillVersion } from "./model.js";

type SkillAccess = Pick<Skill, "userId" | "visibility" | "hidden">;

export const isOwner = (skill: Pick<Skill, "userId">, requester: Requester): boolean =>
  requester !== null && requester.userId === skill.userId;

/** 写操作:必须登录(401),且 URL 里的 user_id 必须与身份头一致(403)(03 §1.2) */
export function assertPathOwner(
  requester: Requester,
  pathUserId: string,
): asserts requester is NonNullable<Requester> {
  if (!requester) throw unauthorized();
  if (requester.userId !== pathUserId) throw forbidden("user_id in path does not match identity");
}

/** 详情可见性(03 §5.2):作者总能看;其他人只能看 PUBLIC 且未下架的 */
export const canView = (skill: SkillAccess, requester: Requester): boolean =>
  isOwner(skill, requester) || (skill.visibility === "PUBLIC" && !skill.hidden);

export type DownloadDecision = "ALLOW" | "FORBIDDEN" | "NOT_DOWNLOADABLE";

/** 全平台唯一的下载门禁(03 §6.3):看不见 → 403;版本不可下 → 400 */
export function checkDownload(
  skill: SkillAccess,
  version: Pick<SkillVersion, "status" | "downloadReady" | "yankedAt">,
  requester: Requester,
): DownloadDecision {
  if (!canView(skill, requester)) return "FORBIDDEN";
  if (version.status !== "PUBLISHED" || !version.downloadReady || version.yankedAt !== null) {
    return "NOT_DOWNLOADABLE";
  }
  return "ALLOW";
}

export interface SearchScope {
  /** 按作者过滤;null 表示不过滤 */
  authorId: string | null;
  /** 能额外看到谁的 PRIVATE;null 表示只看 PUBLIC */
  viewerId: string | null;
}

/** 搜索可见性(03 §4.2):PUBLIC,加上自己的 PRIVATE;user_id=me 需要身份 */
export function searchScope(requester: Requester, userIdParam: string | undefined): SearchScope {
  if (userIdParam === "me") {
    if (!requester) throw unauthorized("user_id=me requires authentication");
    return { authorId: requester.userId, viewerId: requester.userId };
  }
  return { authorId: userIdParam ?? null, viewerId: requester?.userId ?? null };
}

/** 302 还是流式(03 §6.4):HTTPS 且整包存在才 302;降级现打的包只能流式 */
export const shouldRedirect = (isSecure: boolean, bundleExists: boolean): boolean =>
  isSecure && bundleExists;
