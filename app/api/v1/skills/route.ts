import type { NextRequest } from "next/server";
import { querySkills } from "@/lib/server/catalog";
import { ok } from "@/lib/server/http";

/** GET /api/v1/skills?q=&category=&scenario=&page=&size= */
export async function GET(req: NextRequest) {
	const sp = req.nextUrl.searchParams;
	return ok(querySkills({
		q: sp.get("q") ?? undefined,
		category: sp.get("category")?.trim() || undefined,
		scenario: sp.get("scenario")?.trim() || undefined,
		page: Number(sp.get("page") ?? 1),
		size: Number(sp.get("size") ?? 50),
	}));
}
