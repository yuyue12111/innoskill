import { existsSync, readFileSync, statSync } from "node:fs";
import type { NextRequest } from "next/server";
import { fileResponse, skillFilePath } from "@/lib/server/catalog";
import { fail, isTextMime, mimeOf, ok } from "@/lib/server/http";

/** GET /api/v1/skills/:id/file?path=SKILL.md[&raw=1]  文本回 JSON;raw=1 或二进制直接回字节 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/v1/skills/[id]/file">) {
	const { id } = await ctx.params;
	const rel = (req.nextUrl.searchParams.get("path") ?? "").trim();
	const full = skillFilePath(id, rel);
	if (!full) return fail(400, "bad path");
	if (!existsSync(full) || !statSync(full).isFile()) return fail(404, "file not found");
	const st = statSync(full);
	if (st.size > 5 * 1024 * 1024) return fail(413, "file too large");
	const mime = mimeOf(full);
	if (req.nextUrl.searchParams.get("raw") !== "1" && isTextMime(mime)) {
		return ok({ path: rel, size: st.size, mime, content: readFileSync(full, "utf-8") });
	}
	return fileResponse(full, mime);
}
