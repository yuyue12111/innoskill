import { config } from "../config";
import { bearerToken } from "../http";

/** 设了 HUB_TOKEN 时,bundle 协议接口要求 Authorization: Bearer(对应 inno-agent 的 contentHub.token) */
export function bundleUnauthorized(req: Request): Response | null {
	if (config.hubToken && bearerToken(req) !== config.hubToken) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}
	return null;
}
