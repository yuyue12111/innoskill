import type { NextRequest } from "next/server";
import { ok } from "@/lib/server/http";
import { internalDenied } from "@/lib/server/internal-auth";
import { isSyncRunning, runSync } from "@/lib/server/sync/run";

/** POST /internal/sync  给 GitHub webhook / 手动触发用 */
export async function POST(req: NextRequest) {
	const denied = internalDenied(req);
	if (denied) return denied;
	if (isSyncRunning()) return ok({ started: false, running: true });
	void runSync("webhook");
	return ok({ started: true, running: true }, 202);
}
