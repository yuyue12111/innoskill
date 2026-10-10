// 领域类型。ID 在库里是 BIGINT,领域里用 number(适配层负责转换)。

export type Visibility = "PUBLIC" | "PRIVATE";
export const VISIBILITIES = ["PUBLIC", "PRIVATE"] as const satisfies readonly Visibility[];

export type SkillStatus = "ACTIVE" | "ARCHIVED";

// 枚举有 8 个值,本平台只写入 PUBLISHED 与 YANKED(04 §5.1)
export type VersionStatus =
  | "DRAFT"
  | "SCANNING"
  | "SCAN_FAILED"
  | "UPLOADED"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "PUBLISHED"
  | "YANKED";

export interface Skill {
  id: number;
  userId: string;
  slug: string;
  skillName: string | null;
  summary: string | null;
  visibility: Visibility;
  status: SkillStatus;
  latestVersionId: number | null;
  downloadCount: number;
  hidden: boolean;
}

export interface ManifestEntry {
  path: string;
  size: number;
  contentType: string;
}

export interface SkillVersion {
  id: number;
  skillId: number;
  version: string;
  status: VersionStatus;
  requestedVisibility: Visibility | null;
  parsedMetadata: Record<string, unknown> | null;
  manifest: ManifestEntry[] | null;
  fileCount: number;
  totalSize: number;
  bundleReady: boolean;
  downloadReady: boolean;
  publishedAt: Date | null;
  yankedAt: Date | null;
}

export interface SkillFile {
  id: number;
  versionId: number;
  filePath: string;
  fileSize: number;
  contentType: string | null;
  sha256: string;
  storageKey: string;
}

/** 请求者:网关注入的身份;null 表示匿名(合法状态) */
export type Requester = { userId: string } | null;

export const fileKey = (skillId: number, versionId: number, path: string) =>
  `skills/${skillId}/${versionId}/${path}`;

export const bundleKey = (skillId: number, versionId: number) =>
  `packages/${skillId}/${versionId}/bundle.zip`;
