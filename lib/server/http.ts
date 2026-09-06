/** 统一响应壳:{ code, msg, data }。code 0 = 成功。 */
export function ok(data: unknown, status = 200): Response {
	return Response.json({ code: 0, msg: "ok", data }, { status });
}

export function fail(status: number, msg: string, code = status): Response {
	return Response.json({ code, msg, data: null }, { status });
}

export function bearerToken(req: Request): string {
	const h = req.headers.get("authorization") ?? "";
	return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

const MIME: Record<string, string> = {
	md: "text/markdown; charset=utf-8", txt: "text/plain; charset=utf-8", json: "application/json; charset=utf-8",
	yaml: "text/yaml; charset=utf-8", yml: "text/yaml; charset=utf-8", py: "text/x-python; charset=utf-8",
	js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", ts: "text/plain; charset=utf-8",
	html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", csv: "text/csv; charset=utf-8",
	sh: "text/x-shellscript; charset=utf-8", xml: "application/xml; charset=utf-8",
	png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
	pdf: "application/pdf", gz: "application/gzip", zip: "application/zip",
};
export function mimeOf(path: string): string {
	const ext = path.split(".").pop()?.toLowerCase() ?? "";
	return MIME[ext] ?? "application/octet-stream";
}
export function isTextMime(m: string): boolean {
	return m.startsWith("text/") || m.includes("json") || m.includes("yaml") || m.includes("svg") || m.includes("xml");
}
