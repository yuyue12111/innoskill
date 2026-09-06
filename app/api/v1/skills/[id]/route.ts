import { getSkill } from "@/lib/server/catalog";
import { fail, ok } from "@/lib/server/http";

export async function GET(_req: Request, ctx: RouteContext<"/api/v1/skills/[id]">) {
	const { id } = await ctx.params;
	const s = getSkill(id);
	return s ? ok(s) : fail(404, "skill not found");
}
