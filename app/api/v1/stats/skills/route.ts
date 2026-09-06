import { ok } from "@/lib/server/http";
import { allStats } from "@/lib/server/installs";

/** 各技能安装人数 / 浏览数,按安装数降序 */
export async function GET() {
	return ok({ items: allStats() });
}
