import type { NextRequest } from "next/server";
import { serviceDenied } from "@/lib/server/auth/service";
import { config } from "@/lib/server/config";
import { getPack, packSkillIds } from "@/lib/server/catalog";
import { fail, ok } from "@/lib/server/http";
import { installSkills, isValidUserId, listInstalls } from "@/lib/server/installs";

/** GET /api/v1/users/:uid/installs[?history=1]  我的技能 / 安装记录 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/v1/users/[uid]/installs">) {
	const denied = serviceDenied(req); if (denied) return denied;
	const { uid } = await ctx.params;
	if (!isValidUserId(uid)) return fail(400, "bad user id");
	const items = listInstalls(uid, req.nextUrl.searchParams.get("history") === "1");
	return ok({ userId: uid, items, total: items.length });
}

/** POST /api/v1/users/:uid/installs  { skillId } | { skillIds: [] } | { packId }  幂等 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/users/[uid]/installs">) {
	const denied = serviceDenied(req); if (denied) return denied;
	const { uid } = await ctx.params;
	if (!isValidUserId(uid)) return fail(400, "bad user id");
	let body: { skillId?: unknown; skillIds?: unknown; packId?: unknown };
	try { body = (await req.json()) as typeof body; } catch { return fail(400, "body must be JSON"); }

	let ids: string[] = [];
	let pack: ReturnType<typeof getPack> = null;
	if (typeof body.packId === "string") {
		const members = packSkillIds(body.packId);
		if (!members) return fail(404, "pack not found");
		ids = members; pack = getPack(body.packId);
	} else if (Array.isArray(body.skillIds)) {
		ids = body.skillIds.filter((x): x is string => typeof x === "string");
	} else if (typeof body.skillId === "string") {
		ids = [body.skillId];
	}
	if (!ids.length) return fail(400, "need skillId, skillIds or packId");

	const r = installSkills(uid, ids);
	if (!r.installed.length && !r.alreadyInstalled.length) return fail(404, `unknown skills: ${r.unknown.join(", ")}`);
	// 把包地址一并给 InnoAgent,省得再查一次
	const bundles = Object.fromEntries([...r.installed, ...r.alreadyInstalled].map((id) => [id, `${config.publicUrl}/skills/${encodeURIComponent(id)}.tar.gz`]));
	return ok({ userId: uid, pack: pack ? { id: pack.id, name: pack.name } : null, ...r, bundles }, r.installed.length ? 201 : 200);
}
