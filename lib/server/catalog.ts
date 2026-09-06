import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { config } from "./config";
import { getDb, kvGet } from "./db";
import { bundlePath, type Category } from "./sync/pack";
import { isSafeItemName } from "./sync/parse";
import { isSyncRunning } from "./sync/run";

export interface SkillRow {
	id: string; name: string; description: string; category: string; tagline: string; grp: string; type: string;
	verified: number; ref_text: string; ref_url: string; demo_path: string; scenario: string; also_json: string; example: string;
	frontmatter_json: string; files_json: string; body: string; content_hash: string; synced_at: string;
}
export interface PresetRow {
	id: string; name: string; description: string; icon: string; meta_json: string; files_json: string; content_hash: string; synced_at: string;
}

export interface SkillSummary {
	num: string;
	id: string; name: string; description: string; category: string; tagline: string; group: string; type: string;
	verified: boolean; refText: string; refUrl: string; demo: string; hasDemo: boolean;
	scenario: string; also: string[]; example: string;
}

const numCache = globalThis as unknown as { __innoskillNum?: { key: string; map: Map<string, string> } };
/** id → 两位序号,按 id 全局排序;随同步刷新 */
export function numOf(id: string): string {
	const key = kvGet("last_sync") ?? "";
	if (!numCache.__innoskillNum || numCache.__innoskillNum.key !== key) {
		const ids = (getDb().prepare("SELECT id FROM skill ORDER BY id").all() as unknown as Array<{ id: string }>).map((r) => r.id);
		numCache.__innoskillNum = { key, map: new Map(ids.map((x, i) => [x, String(i + 1).padStart(2, "0")])) };
	}
	return numCache.__innoskillNum.map.get(id) ?? "";
}

export function toSummary(r: SkillRow): SkillSummary {
	return {
		num: numOf(r.id),
		id: r.id, name: r.name, description: r.description, category: r.category, tagline: r.tagline,
		group: r.grp, type: r.type, verified: r.verified === 1, refText: r.ref_text, refUrl: r.ref_url,
		demo: r.demo_path ? `${config.publicUrl}/${r.demo_path}` : "", hasDemo: !!r.demo_path,
		scenario: r.scenario, also: JSON.parse(r.also_json) as string[], example: r.example,
	};
}

const SUMMARY_COLS = ["id", "name", "description", "category", "tagline", "grp", "type", "verified", "ref_text", "ref_url", "demo_path", "scenario", "also_json", "example"];

export interface SkillQuery { q?: string; category?: string; scenario?: string; page?: number; size?: number }

export function querySkills(opts: SkillQuery) {
	const db = getDb();
	const q = (opts.q ?? "").trim();
	const page = Math.max(1, Math.floor(opts.page ?? 1) || 1);
	const size = Math.min(200, Math.max(1, Math.floor(opts.size ?? 50) || 50));

	const where: string[] = [];
	const params: Record<string, string | number> = {};
	if (opts.category) { where.push("s.category = @category"); params["category"] = opts.category; }
	if (opts.scenario) {
		where.push("(s.scenario = @scenario OR s.also_json LIKE @scenarioLike)");
		params["scenario"] = opts.scenario; params["scenarioLike"] = `%"${opts.scenario}"%`;
	}

	let from = "skill s";
	let order = "s.id";
	if (q) {
		if (q.length >= 3) {
			// trigram 分词,中英文都能子串匹配;每个词加引号,用户输入不会变成 FTS 语法
			const match = q.split(/\s+/).filter(Boolean).map((t) => `"${t.replace(/"/g, '""')}"`).join(" ");
			from = "skill_fts f JOIN skill s ON s.id = f.id";
			where.push("skill_fts MATCH @match");
			params["match"] = match;
			order = "bm25(skill_fts, 0, 8, 4, 6, 1)";
		} else {
			where.push("(s.name LIKE @like OR s.description LIKE @like OR s.tagline LIKE @like OR s.id LIKE @like)");
			params["like"] = `%${q}%`;
		}
	}
	const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
	const total = (db.prepare(`SELECT COUNT(*) AS n FROM ${from} ${whereSql}`).get(params) as { n: number }).n;
	const rows = db.prepare(`SELECT ${SUMMARY_COLS.map((c) => `s.${c}`).join(", ")} FROM ${from} ${whereSql} ORDER BY ${order} LIMIT @limit OFFSET @offset`)
		.all({ ...params, limit: size, offset: (page - 1) * size }) as unknown as SkillRow[];
	return { items: rows.map(toSummary), total, page, size };
}

export function getSkill(id: string) {
	if (!isSafeItemName(id)) return null;
	const r = getDb().prepare("SELECT * FROM skill WHERE id = ?").get(id) as unknown as SkillRow | undefined;
	if (!r) return null;
	return {
		...toSummary(r),
		frontmatter: JSON.parse(r.frontmatter_json) as Record<string, string>,
		files: JSON.parse(r.files_json) as Array<{ path: string; size: number }>,
		body: r.body,
		contentHash: r.content_hash, syncedAt: r.synced_at,
		bundleUrl: `${config.publicUrl}/skills/${encodeURIComponent(id)}.tar.gz`,
	};
}

/** 源目录(同步后的 checkout 或 SOURCE_LOCAL_DIR) */
export function sourceDir(): string {
	return config.source.localDir || join(config.dataDir, "source");
}

/** 把 <root>/<rel> 解析成绝对路径,越界返回 null */
export function safeJoin(root: string, rel: string): string | null {
	if (!rel || rel.includes("\0")) return null;
	const r = resolve(root);
	const full = resolve(r, normalize(rel));
	if (full !== r && !full.startsWith(r + sep)) return null;
	return full;
}

export function skillFilePath(id: string, rel: string): string | null {
	if (!isSafeItemName(id)) return null;
	return safeJoin(join(sourceDir(), config.source.skillsPath, id), rel);
}

export function presetFilePath(id: string, rel: string): string | null {
	if (!isSafeItemName(id)) return null;
	return safeJoin(join(sourceDir(), config.source.presetsPath, id), rel);
}

export function assetFilePath(rel: string): string | null {
	return safeJoin(join(sourceDir(), config.source.skillsPath, "assets"), rel);
}

/** 文件转 Web ReadableStream 响应(大文件不进内存) */
export function fileResponse(full: string, mime: string, extraHeaders: Record<string, string> = {}): Response {
	const st = statSync(full);
	const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
	return new Response(stream, {
		headers: {
			"Content-Type": mime,
			"Content-Length": String(st.size),
			"Cache-Control": "public, max-age=300",
			...extraHeaders,
		},
	});
}

export function bundleFile(category: Category, id: string): string | null {
	if (!isSafeItemName(id)) return null;
	const p = bundlePath(category, id);
	return existsSync(p) ? p : null;
}

export function listPresetSummaries() {
	return getDb().prepare("SELECT id, name, description, icon FROM preset ORDER BY id").all() as unknown as Array<Pick<PresetRow, "id" | "name" | "description" | "icon">>;
}

export function getPreset(id: string) {
	if (!isSafeItemName(id)) return null;
	const r = getDb().prepare("SELECT * FROM preset WHERE id = ?").get(id) as unknown as PresetRow | undefined;
	if (!r) return null;
	return {
		id: r.id, name: r.name, description: r.description, icon: r.icon,
		meta: JSON.parse(r.meta_json) as Record<string, unknown>,
		files: JSON.parse(r.files_json) as Array<{ path: string; size: number }>,
		contentHash: r.content_hash, syncedAt: r.synced_at,
		bundleUrl: `${config.publicUrl}/presets/${encodeURIComponent(id)}.tar.gz`,
	};
}

export function lastSync(): Record<string, unknown> | null {
	const v = kvGet("last_sync");
	return v ? (JSON.parse(v) as Record<string, unknown>) : null;
}

export function getMeta() {
	const db = getDb();
	const categories = db.prepare("SELECT category AS name, COUNT(*) AS count FROM skill GROUP BY category ORDER BY count DESC, name").all();
	const scCount = new Map<string, number>(
		(db.prepare("SELECT scenario, COUNT(*) AS n FROM skill GROUP BY scenario").all() as unknown as Array<{ scenario: string; n: number }>).map((r) => [r.scenario, r.n]),
	);
	const sc = kvGet("scenarios");
	const scenarios = sc
		? (JSON.parse(sc) as { scenarios: Array<Record<string, unknown> & { key: string }> }).scenarios.map((s) => ({ ...s, count: scCount.get(s.key) ?? 0 }))
		: [];
	return {
		name: "Innoskill",
		repo: config.source.repoUrl.replace(/\.git$/, ""),
		count: {
			skills: (db.prepare("SELECT COUNT(*) AS n FROM skill").get() as { n: number }).n,
			presets: (db.prepare("SELECT COUNT(*) AS n FROM preset").get() as { n: number }).n,
		},
		categories, scenarios,
		lastSync: lastSync(),
		syncing: isSyncRunning(),
	};
}

/** inno-agent bundle 协议的 index.json */
export function buildIndex() {
	const db = getDb();
	const skills = (db.prepare(`SELECT ${SUMMARY_COLS.join(", ")} FROM skill ORDER BY id`).all() as unknown as SkillRow[]).map((r) => {
		const s = toSummary(r);
		return {
			id: s.id, name: s.name, description: s.description, category: s.category,
			tagline: s.tagline, group: s.group, type: s.type, verified: s.verified,
			refText: s.refText, refUrl: s.refUrl, demo: s.demo,
			scenario: s.scenario, also: s.also, example: s.example,
		};
	});
	const presets = listPresetSummaries();
	const last = lastSync();
	return {
		generated: last ? (last["at"] as string) : null,
		count: { skills: skills.length, presets: presets.length },
		skills, presets,
	};
}
