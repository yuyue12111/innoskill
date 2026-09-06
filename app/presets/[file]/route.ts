import { bundleUnauthorized } from "@/lib/server/bundle-auth";
import { bundleFile, fileResponse } from "@/lib/server/catalog";

/** inno-agent bundle 协议:GET /presets/<id>.tar.gz(顶层目录名 = id) */
export async function GET(req: Request, ctx: RouteContext<"/presets/[file]">) {
	const denied = bundleUnauthorized(req);
	if (denied) return denied;
	const { file } = await ctx.params;
	if (!file.endsWith(".tar.gz")) return new Response("not found", { status: 404 });
	const id = file.slice(0, -".tar.gz".length);
	const p = bundleFile("presets", id);
	if (!p) return new Response("not found", { status: 404 });
	return fileResponse(p, "application/gzip", { "Content-Disposition": `attachment; filename="${id}.tar.gz"` });
}
