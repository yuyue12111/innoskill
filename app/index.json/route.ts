import { bundleUnauthorized } from "@/lib/server/auth/bundle";
import { buildIndex } from "@/lib/server/catalog";

/** inno-agent bundle 协议:GET /index.json → { skills, presets } */
export async function GET(req: Request) {
	return bundleUnauthorized(req) ?? Response.json(buildIndex(), { headers: { "Cache-Control": "public, max-age=60" } });
}
