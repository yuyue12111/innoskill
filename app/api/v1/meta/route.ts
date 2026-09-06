import { getMeta } from "@/lib/server/catalog";
import { ok } from "@/lib/server/http";

/** 分类 / 场景 / 数量 / 最近同步 */
export async function GET() {
	return ok(getMeta());
}
