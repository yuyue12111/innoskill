import { listPacks } from "@/lib/server/catalog";
import { ok } from "@/lib/server/http";

/** 技能包列表(严选组合),含技能数与安装人数 */
export async function GET() {
	const items = listPacks();
	return ok({ items, total: items.length });
}
