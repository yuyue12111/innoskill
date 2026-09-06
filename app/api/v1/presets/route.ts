import { listPresetSummaries } from "@/lib/server/catalog";
import { ok } from "@/lib/server/http";

export async function GET() {
	const items = listPresetSummaries();
	return ok({ items, total: items.length });
}
