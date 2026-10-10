import type { Skill, SkillFile, SkillVersion } from "../domain/model.js";

export interface SkillRepository {
  findByUserAndSlug(userId: string, slug: string): Promise<Skill | null>;
  findByIds(ids: number[]): Promise<Skill[]>;
  create(input: Pick<Skill, "userId" | "slug" | "skillName" | "summary" | "visibility">): Promise<Skill>;
  update(
    id: number,
    patch: Partial<Pick<Skill, "skillName" | "summary" | "visibility" | "latestVersionId" | "hidden">>,
  ): Promise<Skill>;
  incrementDownloadCount(id: number): Promise<void>;
}

export type VersionData = Omit<SkillVersion, "id" | "skillId" | "version">;

export interface SkillVersionRepository {
  findBySkillAndVersion(skillId: number, version: string): Promise<SkillVersion | null>;
  findByIds(ids: number[]): Promise<SkillVersion[]>;
  /** 按发布时间倒序 */
  listBySkill(skillId: number): Promise<SkillVersion[]>;
  /** 最近发布且未下架的版本,用于 headline 回退(03 §7.4) */
  findLatestDownloadable(skillId: number): Promise<SkillVersion | null>;
  create(input: { skillId: number; version: string } & VersionData): Promise<SkillVersion>;
  update(id: number, patch: Partial<VersionData>): Promise<SkillVersion>;
}

export interface SkillFileRepository {
  listByVersion(versionId: number): Promise<SkillFile[]>;
  createMany(files: Omit<SkillFile, "id">[]): Promise<void>;
  deleteByVersion(versionId: number): Promise<void>;
}

export interface DownloadStatsRepository {
  /** 懒创建,首次下载时 insert(04 §4.5) */
  increment(skillId: number, versionId: number): Promise<void>;
}

export interface Repositories {
  skills: SkillRepository;
  versions: SkillVersionRepository;
  files: SkillFileRepository;
  stats: DownloadStatsRepository;
}

export type Database = Repositories & {
  /** fn 抛错即回滚 */
  transaction<T>(fn: (repos: Repositories) => Promise<T>): Promise<T>;
};
