import type { NextRequest } from "next/server";
import { config } from "./config";
import { fail } from "./http";

/** /internal/* 用 X-Sync-Secret 头或 ?secret= 鉴权;SYNC_SECRET 未配置则整组接口关闭 */
export function internalDenied(req: NextRequest): Response | null {
	if (!config.syncSecret) return fail(403, "SYNC_SECRET 未配置,接口关闭");
	const given = req.headers.get("x-sync-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
	return given === config.syncSecret ? null : fail(401, "bad secret");
}
