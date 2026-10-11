import { canView } from "../domain/accessControl.js";
import { forbidden, notFound } from "../domain/errors.js";
import type { Requester, Skill, SkillVersion } from "../domain/model.js";
import type { Deps } from "./deps.js";

/** 详情:直接读 skill 表,不碰搜索索引(03 §5.1) */
export async function getSkillDetail(
  deps: Pick<Deps, "db">,
  input: { requester: Requester; userId: string; slug: string },
): Promise<{ skill: Skill; versions: SkillVersion[] }> {
  const skill = await deps.db.skills.findByUserAndSlug(input.userId, input.slug);
  if (!skill) throw notFound(`技能不存在：${input.userId}/${input.slug}`);
  if (!canView(skill, input.requester)) throw forbidden();
  return { skill, versions: await deps.db.versions.listBySkill(skill.id) };
}
