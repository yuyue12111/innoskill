import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import YAML from "yaml";

/** 单段安全名:目录名即 id,禁止路径穿越 */
export function isSafeItemName(name: string): boolean {
	return !!name && !name.includes("/") && !name.includes("\\") && !name.includes("..") && !name.startsWith(".");
}

export interface FileEntry { path: string; size: number }

export interface ParsedSkill {
	id: string;
	name: string;
	description: string;
	category: string;
	frontmatter: Record<string, string>;
	body: string;
	files: FileEntry[];
	contentHash: string;
	dir: string;
}

export interface ReadmeRow {
	group: string;
	type: string;
	verified: boolean;
	tagline: string;
	refText: string;
	refUrl: string;
	demo: string;
}

export interface ScenarioDef { key: string; title: string; blurb: string; color: Record<string, string> }
export interface ScenarioMeta { scenario: string; also: string[]; example: string }
export interface Scenarios {
	fallback: string;
	/** 星图只展示这一组(有序);为空则展示全部 */
	featured: string[];
	scenarios: ScenarioDef[];
	skills: Record<string, ScenarioMeta>;
}

export interface ParsedPreset {
	id: string;
	name: string;
	description: string;
	icon: string;
	meta: Record<string, unknown>;
	files: FileEntry[];
	contentHash: string;
	dir: string;
}

const MD_LINK = /\[([^\]]+)\]\(([^)]+)\)/;

/** SKILL.md 顶部 frontmatter。YAML 解析失败时退回逐行 key: value,尽量不丢技能。 */
export function splitFrontmatter(text: string): { frontmatter: Record<string, string>; body: string } {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
	if (!m) return { frontmatter: {}, body: text };
	const raw = m[1] ?? "";
	const body = text.slice(m[0].length);
	let fm: Record<string, string> = {};
	try {
		const parsed = YAML.parse(raw);
		if (parsed && typeof parsed === "object") {
			for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
				fm[k] = typeof v === "string" ? v.trim() : v == null ? "" : Array.isArray(v) ? v.map(String).join(", ") : JSON.stringify(v);
			}
		}
	} catch {
		fm = {};
		for (const line of raw.split("\n")) {
			const i = line.indexOf(":");
			if (i > 0 && /^[A-Za-z_-]+$/.test(line.slice(0, i).trim())) {
				fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
			}
		}
	}
	return { frontmatter: fm, body };
}

/** skill-library/README.md 的目录表:### 分组 + | Skill | 类型 | 通过验证 | 一句话 | 引用 | 效果 | */
export function parseReadme(text: string): Record<string, ReadmeRow> {
	const rows: Record<string, ReadmeRow> = {};
	let group = "";
	let cols: string[] | null = null;
	for (const rawLine of text.split("\n")) {
		const line = rawLine.replace(/\r$/, "");
		if (line.startsWith("### ")) { group = line.slice(4).trim(); cols = null; continue; }
		if (line.startsWith("| Skill |")) { cols = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()); continue; }
		if (!cols || !line.startsWith("|")) continue;
		if (/^[\s|:-]+$/.test(line)) continue;
		const cells = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
		if (cells.length !== cols.length) continue;
		const rec: Record<string, string> = {};
		cols.forEach((c, i) => { rec[c] = cells[i] ?? ""; });
		const m = MD_LINK.exec(rec["Skill"] ?? "");
		if (!m) continue;
		const id = (m[2] ?? "").replace(/^\.?\//, "").replace(/\/$/, "");
		const rm = MD_LINK.exec(rec["引用"] ?? "");
		const dm = MD_LINK.exec(rec["效果"] ?? "");
		rows[id] = {
			group,
			type: rec["类型"] || "收集",
			verified: !!(rec["通过验证"] ?? "").trim(),
			tagline: (rec["一句话"] ?? "").trim(),
			refText: rm?.[1] ?? "",
			refUrl: rm?.[2] ?? "",
			demo: (dm?.[2] ?? "").replace(/^\.?\//, ""),
		};
	}
	return rows;
}

export function parseScenarios(text: string): Scenarios {
	const raw = JSON.parse(text) as Partial<Scenarios>;
	return {
		fallback: raw.fallback ?? "",
		featured: Array.isArray(raw.featured) ? raw.featured.filter((x): x is string => typeof x === "string") : [],
		scenarios: Array.isArray(raw.scenarios) ? raw.scenarios : [],
		skills: raw.skills && typeof raw.skills === "object" ? raw.skills : {},
	};
}

/** 递归列出目录里的文件(相对路径,POSIX 分隔),顺手算内容哈希 */
export function walkFiles(root: string): { files: FileEntry[]; hash: string } {
	const files: FileEntry[] = [];
	const h = createHash("sha256");
	const walk = (dir: string) => {
		for (const ent of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
			if (ent.name === ".DS_Store") continue;
			const full = join(dir, ent.name);
			if (ent.isDirectory()) { walk(full); continue; }
			if (!ent.isFile()) continue;
			const rel = relative(root, full).split("\\").join("/");
			const size = statSync(full).size;
			files.push({ path: rel, size });
			h.update(rel).update("\0").update(readFileSync(full)).update("\0");
		}
	};
	walk(root);
	return { files, hash: h.digest("hex").slice(0, 16) };
}

export function listSkills(libDir: string): ParsedSkill[] {
	if (!existsSync(libDir)) return [];
	const out: ParsedSkill[] = [];
	for (const ent of readdirSync(libDir, { withFileTypes: true })) {
		if (!ent.isDirectory() || !isSafeItemName(ent.name) || ent.name === "assets") continue;
		const dir = join(libDir, ent.name);
		const skillMd = join(dir, "SKILL.md");
		if (!existsSync(skillMd)) continue;
		const { frontmatter, body } = splitFrontmatter(readFileSync(skillMd, "utf-8"));
		const { files, hash } = walkFiles(dir);
		out.push({
			id: ent.name,
			name: frontmatter["name"] || ent.name,
			description: frontmatter["description"] ?? "",
			category: frontmatter["category"] ?? "",
			frontmatter, body, files, contentHash: hash, dir,
		});
	}
	return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function listPresets(dir: string): ParsedPreset[] {
	if (!existsSync(dir)) return [];
	const out: ParsedPreset[] = [];
	for (const ent of readdirSync(dir, { withFileTypes: true })) {
		// _template 这类下划线开头的目录是脚手架,不是可用预设
		if (!ent.isDirectory() || !isSafeItemName(ent.name) || ent.name.startsWith("_")) continue;
		const pdir = join(dir, ent.name);
		const pj = join(pdir, "preset.json");
		if (!existsSync(pj)) continue;
		let meta: Record<string, unknown> = {};
		try { meta = JSON.parse(readFileSync(pj, "utf-8")) as Record<string, unknown>; } catch { continue; }
		// inno-agent 的硬规则:preset.json 里的 id 必须等于目录名
		if (typeof meta["id"] === "string" && meta["id"] !== ent.name) continue;
		const { files, hash } = walkFiles(pdir);
		out.push({
			id: ent.name,
			name: typeof meta["name"] === "string" ? meta["name"] : ent.name,
			description: typeof meta["description"] === "string" ? meta["description"] : "",
			icon: typeof meta["icon"] === "string" ? meta["icon"] : "",
			meta, files, contentHash: hash, dir: pdir,
		});
	}
	return out.sort((a, b) => a.id.localeCompare(b.id));
}

/** skill-library/assets/<id>/ 下第一张图或 gif 作为演示 */
export function findDemo(assetsDir: string, id: string): string {
	const d = join(assetsDir, id);
	if (!existsSync(d)) return "";
	const f = readdirSync(d).sort().find((n) => /\.(gif|png|jpe?g|webp)$/i.test(n));
	return f ? `assets/${id}/${f}` : "";
}
