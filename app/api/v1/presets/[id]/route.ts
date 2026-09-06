import { getPreset } from "@/lib/server/catalog";
import { fail, ok } from "@/lib/server/http";

export async function GET(_req: Request, ctx: RouteContext<"/api/v1/presets/[id]">) {
	const { id } = await ctx.params;
	const p = getPreset(id);
	return p ? ok(p) : fail(404, "preset not found");
}
