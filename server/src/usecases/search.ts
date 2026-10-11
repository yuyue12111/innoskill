import { searchScope } from "../domain/accessControl.js";
import type { Requester, Skill, SkillVersion } from "../domain/model.js";
import type { SearchSort } from "../ports/searchIndex.js";
import type { Deps } from "./deps.js";

export interface SearchInput {
  requester: Requester;
  q: string | null;
  userId: string | undefined;
  tags: string[];
  sort: SearchSort;
  page: number;
  size: number;
}

export interface SearchHit {
  skill: Skill;
  headline: SkillVersion | null;
}

/** 两阶段读(03 §4.1):索引决定命中与顺序,内容以数据库为准 */
export async function searchSkills(
  deps: Pick<Deps, "db" | "searchIndex">,
  input: SearchInput,
): Promise<{ hits: SearchHit[]; total: number }> {
  const scope = searchScope(input.requester, input.userId);
  const { ids, total } = await deps.searchIndex.search({
    q: input.q,
    ...scope,
    tags: input.tags,
    sort: input.sort,
    page: input.page,
    size: input.size,
  });

  const skills = await deps.db.skills.findByIds(ids);
  const versions = await deps.db.versions.findByIds(
    skills.flatMap((s) => (s.latestVersionId === null ? [] : [s.latestVersionId])),
  );
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const versionById = new Map(versions.map((v) => [v.id, v]));

  const hits = ids.flatMap((id) => {
    const skill = skillById.get(id);
    if (!skill) return [];
    const headline = skill.latestVersionId === null ? null : (versionById.get(skill.latestVersionId) ?? null);
    return [{ skill, headline }];
  });
  return { hits, total };
}
