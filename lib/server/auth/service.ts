import { config } from "../config";
import { fail } from "../http";

/** InnoAgent 后端 → Innoskill 的服务端调用:X-Innoskill-Key。SERVICE_KEY 未配置则这组接口关闭。 */
export function serviceDenied(req: Request): Response | null {
	if (!config.serviceKey) return fail(403, "SERVICE_KEY 未配置,用户相关接口关闭");
	const given = req.headers.get("x-innoskill-key") ?? "";
	return given === config.serviceKey ? null : fail(401, "bad service key");
}
