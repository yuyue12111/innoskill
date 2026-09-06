import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { ok } from "@/lib/server/http";
import { internalDenied } from "@/lib/server/internal-auth";

/** GET /internal/sync/runs  最近 20 次同步记录 */
export async function GET(req: NextRequest) {
	return internalDenied(req) ?? ok(getDb().prepare("SELECT * FROM sync_run ORDER BY id DESC LIMIT 20").all());
}
