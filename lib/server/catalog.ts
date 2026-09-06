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
	install_count?: number; view_count?: number;
}
export interface PresetRow {
	id: string; name: string; description: string; icon: string; meta_json: string; files_json: string; content_hash: string; synced_at: string;
}

export interface SkillSummary {
	num: string;
	featured: boolean;
	id: string; name: string; description: string; category: string; tagline: string; group: string; type: string;
	verified: boolean; refText: string; refUrl: string; demo: string; hasDemo: boolean;
	scenario: string; also: string[]; example: string;
	subject: string; kind: string;
	installCount: number; viewCount: number;
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

const featCache = globalThis as unknown as { __innoskillFeat?: { key: string; ids: string[]; set: Set<string> } };
/** scenarios.json 里的 featured 列表(有序);随同步刷新 */
export function featuredIds(): string[] {
	const key = kvGet("last_sync") ?? "";
	if (!featCache.__innoskillFeat || featCache.__innoskillFeat.key !== key) {
		const sc = kvGet("scenarios");
		const ids = sc ? ((JSON.parse(sc) as { featured?: string[] }).featured ?? []) : [];
		featCache.__innoskillFeat = { key, ids, set: new Set(ids) };
	}
	return featCache.__innoskillFeat.ids;
}
export function isFeatured(id: string): boolean { featuredIds(); return featCache.__innoskillFeat!.set.has(id); }

export function toSummary(r: SkillRow): SkillSummary {
	return {
		num: numOf(r.id),
		featured: isFeatured(r.id),
		id: r.id, name: r.name, description: r.description, category: r.category, tagline: r.tagline,
		group: r.grp, type: r.type, verified: r.verified === 1, refText: r.ref_text, refUrl: r.ref_url,
		demo: r.demo_path ? `${config.publicUrl}/${r.demo_path}` : "", hasDemo: !!r.demo_path,
		scenario: r.scenario, also: JSON.parse(r.also_json) as string[], example: r.example,
		subject: fmField(r, "subject"), kind: fmField(r, "kind"),
		installCount: r.install_count ?? 0, viewCount: r.view_count ?? 0,
	};
}

/** 店面维度(subject / kind)直接读 frontmatter,不加列 */
function fmField(r: SkillRow, k: string): string {
	try { const v = (JSON.parse(r.frontmatter_json) as Record<string, unknown>)[k]; return typeof v === "string" ? v : ""; } catch { return ""; }
}

/** 技能查询的固定 FROM/SELECT:带上安装数与浏览数 */
const STAT_JOIN = "LEFT JOIN skill_stat st ON st.skill_id = s.id";
const SKILL_FROM = `skill s ${STAT_JOIN}`;
const STAT_COLS = "COALESCE(st.install_count, 0) AS install_count, COALESCE(st.view_count, 0) AS view_count";

const SUMMARY_COLS = ["id", "name", "description", "category", "tagline", "grp", "type", "verified", "ref_text", "ref_url", "demo_path", "scenario", "also_json", "example", "frontmatter_json"];
const SUMMARY_SELECT = `${SUMMARY_COLS.map((c) => `s.${c}`).join(", ")}, ${STAT_COLS}`;

export interface SkillQuery { q?: string; category?: string; scenario?: string; featured?: boolean; subject?: string; kind?: string; pack?: string; page?: number; size?: number }

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
	if (opts.featured) {
		const ids = featuredIds();
		if (!ids.length) return { items: [], total: 0, page, size };
		where.push(`s.id IN (${ids.map((_, i) => `@f${i}`).join(", ")})`);
		ids.forEach((id, i) => { params[`f${i}`] = id; });
	}
	// InnoAgent 店面维度:frontmatter 里的 subject / kind;以及按技能包筛
	if (opts.subject) { where.push("json_extract(s.frontmatter_json, '$.subject') = @subject"); params["subject"] = opts.subject; }
	if (opts.kind) { where.push("json_extract(s.frontmatter_json, '$.kind') = @kind"); params["kind"] = opts.kind; }
	if (opts.pack) { where.push("s.id IN (SELECT skill_id FROM pack_skill WHERE pack_id = @pack)"); params["pack"] = opts.pack; }

	let from = SKILL_FROM;
	let order = "s.id";
	if (q) {
		if (q.length >= 3) {
			// trigram 分词,中英文都能子串匹配;每个词加引号,用户输入不会变成 FTS 语法
			const match = q.split(/\s+/).filter(Boolean).map((t) => `"${t.replace(/"/g, '""')}"`).join(" ");
			from = `skill_fts f JOIN skill s ON s.id = f.id ${STAT_JOIN}`;
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
	const rows = db.prepare(`SELECT ${SUMMARY_SELECT} FROM ${from} ${whereSql} ORDER BY ${order} LIMIT @limit OFFSET @offset`)
		.all({ ...params, limit: size, offset: (page - 1) * size }) as unknown as SkillRow[];
	return { items: rows.map(toSummary), total, page, size };
}

export function getSkill(id: string) {
	if (!isSafeItemName(id)) return null;
	const r = getDb().prepare(`SELECT s.*, ${STAT_COLS} FROM ${SKILL_FROM} WHERE s.id = ?`).get(id) as unknown as SkillRow | undefined;
	if (!r) return null;
	return {
		...toSummary(r),
		packs: packsOfSkill(id),
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
	// 别名不能叫 name:会被 skill.name 列抢先解析,GROUP BY 就变成按技能名分组
	const facet = (field: string) => (db.prepare(`SELECT json_extract(frontmatter_json, '$.${field}') AS value, COUNT(*) AS count FROM skill WHERE value IS NOT NULL AND value <> '' GROUP BY value ORDER BY count DESC, value`).all() as unknown as Array<{ value: string; count: number }>)
		.map((r) => ({ name: r.value, count: r.count }));
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
			featured: featuredIds().length,
		},
		categories, scenarios,
		subjects: facet("subject"), kinds: facet("kind"),
		lastSync: lastSync(),
		syncing: isSyncRunning(),
	};
}

/** inno-agent bundle 协议的 index.json */
export function buildIndex() {
	const db = getDb();
	const skills = (db.prepare(`SELECT ${SUMMARY_SELECT} FROM ${SKILL_FROM} ORDER BY s.id`).all() as unknown as SkillRow[]).map((r) => {
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

/* ───────────── 技能包 ───────────── */

export interface PackRow { id: string; name: string; description: string; subject: string; curated_by: string; created_at: string }
export interface PackSummary { id: string; name: string; description: string; icon: string; subject: string; skillCount: number; installCount: number }

/** 装了这个包里任一技能(且未卸载)的去重用户数 */
const PACK_INSTALLS = "(SELECT COUNT(DISTINCT ui.user_id) FROM user_install ui JOIN pack_skill ps ON ps.skill_id = ui.skill_id WHERE ps.pack_id = p.id AND ui.uninstalled_at IS NULL)";

function toPackSummary(r: PackRow & { skill_count: number; install_count: number }): PackSummary {
	return { id: r.id, name: r.name, description: r.description, icon: r.curated_by || "boxes", subject: r.subject, skillCount: r.skill_count, installCount: r.install_count };
}

export function listPacks(): PackSummary[] {
	const rows = getDb().prepare(`SELECT p.*, (SELECT COUNT(*) FROM pack_skill ps WHERE ps.pack_id = p.id) AS skill_count, ${PACK_INSTALLS} AS install_count FROM pack p ORDER BY p.rowid`).all() as unknown as Array<PackRow & { skill_count: number; install_count: number }>;
	return rows.map(toPackSummary);
}

export function getPack(id: string) {
	if (!isSafeItemName(id)) return null;
	const db = getDb();
	const r = db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM pack_skill ps WHERE ps.pack_id = p.id) AS skill_count, ${PACK_INSTALLS} AS install_count FROM pack p WHERE p.id = ?`).get(id) as unknown as (PackRow & { skill_count: number; install_count: number }) | undefined;
	if (!r) return null;
	const skills = (db.prepare(`SELECT ${SUMMARY_SELECT} FROM pack_skill ps JOIN skill s ON s.id = ps.skill_id ${STAT_JOIN} WHERE ps.pack_id = ? ORDER BY ps.ord`).all(id) as unknown as SkillRow[]).map(toSummary);
	return { ...toPackSummary(r), skills };
}

export function packSkillIds(id: string): string[] | null {
	if (!isSafeItemName(id)) return null;
	const db = getDb();
	if (!db.prepare("SELECT 1 FROM pack WHERE id = ?").get(id)) return null;
	return (db.prepare("SELECT skill_id FROM pack_skill WHERE pack_id = ? ORDER BY ord").all(id) as unknown as Array<{ skill_id: string }>).map((r) => r.skill_id);
}

export function packsOfSkill(skillId: string): Array<{ id: string; name: string }> {
	return getDb().prepare("SELECT p.id, p.name FROM pack p JOIN pack_skill ps ON ps.pack_id = p.id WHERE ps.skill_id = ? ORDER BY p.rowid").all(skillId) as unknown as Array<{ id: string; name: string }>;
}

export function skillExists(id: string): boolean {
	return isSafeItemName(id) && !!getDb().prepare("SELECT 1 FROM skill WHERE id = ?").get(id);
}

/** 给 installs.ts 等复用的技能 summary SQL 片段 */
export const SKILL_SUMMARY_SQL = { select: SUMMARY_SELECT, from: SKILL_FROM, statJoin: STAT_JOIN } as const;
