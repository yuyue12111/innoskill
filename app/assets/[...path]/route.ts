import { existsSync, statSync } from "node:fs";
import { assetFilePath, fileResponse } from "@/lib/server/catalog";
import { mimeOf } from "@/lib/server/http";

/** /assets/<id>/demo.gif → <source>/skill-library/assets/<id>/demo.gif */
export async function GET(_req: Request, ctx: RouteContext<"/assets/[...path]">) {
	const { path } = await ctx.params;
	const full = assetFilePath(path.join("/"));
	if (!full || !existsSync(full) || !statSync(full).isFile()) return new Response("not found", { status: 404 });
	return fileResponse(full, mimeOf(full), { "Cache-Control": "public, max-age=3600" });
}
