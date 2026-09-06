import { config } from "../config";
import { getDb, kvGet } from "../db";
import type { SkillRow } from "../catalog";
import { featuredIds, toSummary, type SkillSummary } from "../catalog";
import { clusterPositions, layoutMap, WORLD_H, WORLD_W } from "./layout";
import { makeTile, Rand, seedOf } from "./riso";

export interface MapSkill extends SkillSummary {
	svg: string; w: number; h: number; pattern: string;
	x: number; y: number;
	fx: number; fy: number; dur: number; delay: number; rot: number;
}
export interface MapScenario { key: string; title: string; blurb: string; color: Record<string, string>; count: number; x: number; y: number }
export interface MapData {
	generated: string | null;
	/** 技能总数(星图可能只放精选) */
	total: number;
	featuredOnly: boolean;
	repo: string;
	world: { w: number; h: number };
	scenarios: MapScenario[];
	skills: MapSkill[];
}

const g = globalThis as unknown as { __innoskillMap?: { key: string; data: MapData } };

export function getMapData(): MapData {
	const last = kvGet("last_sync") ?? "";
	if (g.__innoskillMap && g.__innoskillMap.key === last) return g.__innoskillMap.data;

	const db = getDb();
	const sc = kvGet("scenarios");
	const defs = sc ? (JSON.parse(sc) as { scenarios: Array<{ key: string; title: string; blurb: string; color: Record<string, string> }> }).scenarios : [];
	const pos = clusterPositions(defs.map((d) => d.key));

	const all = db.prepare("SELECT * FROM skill ORDER BY id").all() as unknown as SkillRow[];
	// 星图是展示位,不是全集:scenarios.json 的 featured 非空就只放这一组,按它的顺序
	const feat = featuredIds();
	const order = new Map(feat.map((id, i) => [id, i]));
	const rows = feat.length ? all.filter((r) => order.has(r.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!) : all;
	// 图块少就放大一点,免得画布空荡
	const scale = Math.min(1.7, Math.max(1, Math.sqrt(60 / Math.max(1, rows.length))));
	const skills: MapSkill[] = rows.map((r) => {
		const s = toSummary(r);
		const raw = makeTile(s.id, s.scenario);
		const art = {
			...raw,
			w: Math.round(raw.w * scale), h: Math.round(raw.h * scale),
			svg: raw.svg.replace(`width="${raw.w}" height="${raw.h}"`, `width="${Math.round(raw.w * scale)}" height="${Math.round(raw.h * scale)}"`),
		};
		// 漂浮参数:幅度保底 11px,否则看起来跟静止没区别
		const fr = new Rand(seedOf(s.id + "float"));
		let fx = fr.rng(-24, 24), fy = fr.rng(-24, 24);
		if (Math.abs(fx) < 11) fx = fx >= 0 ? 11 : -11;
		if (Math.abs(fy) < 11) fy = fy >= 0 ? 11 : -11;
		return {
			...s,
			svg: art.svg, w: art.w, h: art.h, pattern: art.pattern, x: 0, y: 0,
			fx: Math.round(fx * 10) / 10, fy: Math.round(fy * 10) / 10,
			dur: Math.round(fr.rng(6, 13) * 10) / 10, delay: Math.round(fr.rng(0, 7) * 10) / 10,
			rot: Math.round(fr.rng(-1.6, 1.6) * 100) / 100,
		};
	});
	layoutMap(skills, pos);

	const counts = new Map<string, number>();
	for (const s of skills) counts.set(s.scenario, (counts.get(s.scenario) ?? 0) + 1);
	const data: MapData = {
		generated: last ? ((JSON.parse(last) as { at: string }).at ?? null) : null,
		total: all.length,
		featuredOnly: feat.length > 0,
		repo: config.source.repoUrl.replace(/\.git$/, ""),
		world: { w: WORLD_W, h: WORLD_H },
		scenarios: defs.map((d) => ({ ...d, count: counts.get(d.key) ?? 0, x: pos[d.key]![0], y: pos[d.key]![1] })),
		skills,
	};
	g.__innoskillMap = { key: last, data };
	return data;
}
