import { lastSync } from "@/lib/server/catalog";
export async function GET() {
	return Response.json({ ok: true, lastSync: lastSync() });
}
