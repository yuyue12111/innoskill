import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "../config";
import { getDb, kvSet } from "../db";
import { ensureSource } from "./git";
import { bundlePath, packItem, removeBundle } from "./pack";
import { findDemo, listPresets, listSkills, parseReadme, parseScenarios, type Scenarios } from "./parse";

export interface SyncResult {
	ok: boolean;
	sha: string;
	skills: number;
	presets: number;
	packed: number;
	message: string;
	durationMs: number;
}

// 同步锁挂 globalThis:dev 热更新重载模块时不丢
const g = globalThis as unknown as { __innoskillSync?: Promise<SyncResult> | null };

/** 同一时刻只跑一个同步;正在跑时再触发就复用那次的 Promise。 */
export function runSync(reason: string): Promise<SyncResult> {
	if (g.__innoskillSync) return g.__innoskillSync;
	g.__innoskillSync = doSync(reason).finally(() => { g.__innoskillSync = null; });
	return g.__innoskillSync;
}

export function isSyncRunning(): boolean {
	return !!g.__innoskillSync;
}

async function doSync(reason: string): Promise<SyncResult> {
	const db = getDb();
	const t0 = Date.now();
	const startedAt = new Date().toISOString();
	const runId = Number(
		(db.prepare("INSERT INTO sync_run (started_at, reason, source_ref) VALUES (?, ?, ?)").run(startedAt, reason, config.source.ref) as { lastInsertRowid: number | bigint }).lastInsertRowid,
	);
	const finish = (status: string, message: string, extra: Partial<SyncResult> = {}) => {
		db.prepare("UPDATE sync_run SET finished_at = ?, status = ?, message = ?, commit_sha = ?, skills = ?, presets = ? WHERE id = ?")
			.run(new Date().toISOString(), status, message, extra.sha ?? "", extra.skills ?? 0, extra.presets ?? 0, runId);
	};

	try {
		const src = ensureSource();
		const libDir = join(src.dir, config.source.skillsPath);
		const presetsDir = join(src.dir, config.source.presetsPath);
		const assetsDir = join(libDir, "assets");

		const readme = existsSync(join(libDir, "README.md")) ? parseReadme(readFileSync(join(libDir, "README.md"), "utf-8")) : {};
		const scenarios: Scenarios = existsSync(join(libDir, "scenarios.json"))
			? parseScenarios(readFileSync(join(libDir, "scenarios.json"), "utf-8"))
			: { fallback: "", scenarios: [], skills: {} };
		const validScenario = new Set(scenarios.scenarios.map((s) => s.key));

		const skills = listSkills(libDir);
		const presets = listPresets(presetsDir);
		const now = new Date().toISOString();

		// 哪些包要重打:内容哈希变了,或者包文件丢了
		const oldSkillHash = new Map<string, string>(
			(db.prepare("SELECT id, content_hash FROM skill").all() as Array<{ id: string; content_hash: string }>).map((r) => [r.id, r.content_hash]),
		);
		const oldPresetHash = new Map<string, string>(
			(db.prepare("SELECT id, content_hash FROM preset").all() as Array<{ id: string; content_hash: string }>).map((r) => [r.id, r.content_hash]),
		);

		let packed = 0;
		for (const s of skills) {
			if (oldSkillHash.get(s.id) !== s.contentHash || !existsSync(bundlePath("skills", s.id))) {
				await packItem("skills", s.id, s.dir); packed++;
			}
		}
		for (const p of presets) {
			if (oldPresetHash.get(p.id) !== p.contentHash || !existsSync(bundlePath("presets", p.id))) {
				await packItem("presets", p.id, p.dir); packed++;
			}
		}

		// 索引整体替换,放在一个事务里,读请求要么看到旧的要么看到新的
		const upsertSkill = db.prepare(`
			INSERT INTO skill (id, name, description, category, tagline, grp, type, verified, ref_text, ref_url, demo_path,
			                   scenario, also_json, example, frontmatter_json, files_json, body, content_hash, synced_at)
			VALUES (@id, @name, @description, @category, @tagline, @grp, @type, @verified, @ref_text, @ref_url, @demo_path,
			        @scenario, @also_json, @example, @frontmatter_json, @files_json, @body, @content_hash, @synced_at)
			ON CONFLICT(id) DO UPDATE SET
			  name=excluded.name, description=excluded.description, category=excluded.category, tagline=excluded.tagline,
			  grp=excluded.grp, type=excluded.type, verified=excluded.verified, ref_text=excluded.ref_text, ref_url=excluded.ref_url,
			  demo_path=excluded.demo_path, scenario=excluded.scenario, also_json=excluded.also_json, example=excluded.example,
			  frontmatter_json=excluded.frontmatter_json, files_json=excluded.files_json, body=excluded.body,
			  content_hash=excluded.content_hash, synced_at=excluded.synced_at
		`);
		const upsertPreset = db.prepare(`
			INSERT INTO preset (id, name, description, icon, meta_json, files_json, content_hash, synced_at)
			VALUES (@id, @name, @description, @icon, @meta_json, @files_json, @content_hash, @synced_at)
			ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, icon=excluded.icon,
			  meta_json=excluded.meta_json, files_json=excluded.files_json, content_hash=excluded.content_hash, synced_at=excluded.synced_at
		`);
		const insFts = db.prepare("INSERT INTO skill_fts (id, name, description, tagline, body) VALUES (?, ?, ?, ?, ?)");

		db.exec("BEGIN");
		try {
			for (const s of skills) {
				const r = readme[s.id];
				const sc = scenarios.skills[s.id];
				const scenario = sc && validScenario.has(sc.scenario) ? sc.scenario : scenarios.fallback;
				const also = (sc?.also ?? []).filter((a) => validScenario.has(a) && a !== scenario);
				upsertSkill.run({
					id: s.id, name: s.name, description: s.description, category: s.category || "未分类",
					tagline: r?.tagline || s.description.slice(0, 60),
					grp: r?.group ?? "", type: r?.type ?? "收集", verified: r?.verified ? 1 : 0,
					ref_text: r?.refText ?? "", ref_url: r?.refUrl ?? "",
					demo_path: r?.demo || findDemo(assetsDir, s.id),
					scenario, also_json: JSON.stringify(also),
					example: sc?.example ?? `用 ${s.id} 来帮我……`,
					frontmatter_json: JSON.stringify(s.frontmatter), files_json: JSON.stringify(s.files),
					body: s.body, content_hash: s.contentHash, synced_at: now,
				});
			}
			for (const p of presets) {
				upsertPreset.run({
					id: p.id, name: p.name, description: p.description, icon: p.icon,
					meta_json: JSON.stringify(p.meta), files_json: JSON.stringify(p.files),
					content_hash: p.contentHash, synced_at: now,
				});
			}
			// 源里已删掉的
			const gone = db.prepare("DELETE FROM skill WHERE synced_at <> ? RETURNING id").all(now) as Array<{ id: string }>;
			const gonePresets = db.prepare("DELETE FROM preset WHERE synced_at <> ? RETURNING id").all(now) as Array<{ id: string }>;
			for (const g of gone) removeBundle("skills", g.id);
			for (const g of gonePresets) removeBundle("presets", g.id);

			db.exec("DELETE FROM skill_fts");
			for (const s of skills) insFts.run(s.id, s.name, s.description, readme[s.id]?.tagline ?? "", s.body);

			kvSet("scenarios", JSON.stringify(scenarios));
			kvSet("last_sync", JSON.stringify({ at: now, sha: src.sha, ref: src.ref, skills: skills.length, presets: presets.length }));
			db.exec("COMMIT");
		} catch (e) {
			db.exec("ROLLBACK");
			throw e;
		}

		const res: SyncResult = { ok: true, sha: src.sha, skills: skills.length, presets: presets.length, packed, message: "ok", durationMs: Date.now() - t0 };
		finish("ok", `skills=${skills.length} presets=${presets.length} packed=${packed}`, res);
		console.log(`[sync] ${reason}: ${src.ref}@${src.sha} skills=${skills.length} presets=${presets.length} packed=${packed} (${res.durationMs}ms)`);
		return res;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		finish("failed", message);
		console.error(`[sync] ${reason} failed: ${message}`);
		return { ok: false, sha: "", skills: 0, presets: 0, packed: 0, message, durationMs: Date.now() - t0 };
	}
}
