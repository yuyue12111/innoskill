import { assertPathOwner } from "../domain/accessControl.js";
import { notFound } from "../domain/errors.js";
import type { Requester, Skill } from "../domain/model.js";
import type { Deps } from "./deps.js";

/** 技能下架(03 §8):只翻 hidden,不删数据;搜索靠 JOIN skill 过滤,无需动索引 */
export async function hideSkill(
  deps: Pick<Deps, "db" | "clock">,
  input: { requester: Requester; userId: string; slug: string },
): Promise<{ skill: Skill; hiddenAt: Date }> {
  assertPathOwner(input.requester, input.userId);
  const skill = await deps.db.skills.findByUserAndSlug(input.userId, input.slug);
  if (!skill) throw notFound(`技能不存在：${input.userId}/${input.slug}`);
  const updated = skill.hidden ? skill : await deps.db.skills.update(skill.id, { hidden: true });
  return { skill: updated, hiddenAt: deps.clock.now() };
}
