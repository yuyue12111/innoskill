import { getPack } from "@/lib/server/catalog";
import { fail, ok } from "@/lib/server/http";

export async function GET(_req: Request, ctx: RouteContext<"/api/v1/packs/[id]">) {
	const { id } = await ctx.params;
	const p = getPack(id);
	return p ? ok(p) : fail(404, "pack not found");
}
