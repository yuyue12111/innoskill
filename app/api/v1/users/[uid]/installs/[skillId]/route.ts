import type { NextRequest } from "next/server";
import { serviceDenied } from "@/lib/server/auth/service";
import { fail, ok } from "@/lib/server/http";
import { isValidUserId, uninstallSkill } from "@/lib/server/installs";
import { isSafeItemName } from "@/lib/server/sync/parse";

/** DELETE /api/v1/users/:uid/installs/:skillId  记录卸载(保留历史) */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/v1/users/[uid]/installs/[skillId]">) {
	const denied = serviceDenied(req); if (denied) return denied;
	const { uid, skillId } = await ctx.params;
	if (!isValidUserId(uid) || !isSafeItemName(skillId)) return fail(400, "bad id");
	const removed = uninstallSkill(uid, skillId);
	return removed ? ok({ userId: uid, skillId, removed: true }) : fail(404, "not installed");
}
