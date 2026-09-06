import { getMapData } from "@/lib/server/map";
import { ok } from "@/lib/server/http";

/** 星图首页数据:场景星系坐标 + 每个技能的 riso 图块、落位、漂浮参数 */
export async function GET() {
	return ok(getMapData());
}
