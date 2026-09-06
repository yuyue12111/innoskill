import { ok } from "@/lib/server/http";
import { recordView } from "@/lib/server/installs";

/** POST /api/v1/skills/:id/view  浏览计数(匿名,不去重) */
export async function POST(_req: Request, ctx: RouteContext<"/api/v1/skills/[id]/view">) {
	const { id } = await ctx.params;
	recordView(id);
	return ok({ id });
}
