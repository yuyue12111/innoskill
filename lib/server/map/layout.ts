import { Rand, seedOf } from "./riso";

export const WORLD_W = 1980, WORLD_H = 1180;
/** 五个星系在画布上的落位;scenarios.json 里若出现别的 key,按椭圆均匀补位 */
const CLUSTER_POS: Record<string, [number, number]> = {
	备课: [452, 556], 讲课: [898, 248], 自学: [772, 906], 研究: [1352, 798], 创造: [1566, 412],
};
const LABEL_HALF_W = 188, LABEL_HALF_H = 96;
const CORNER_FONT = 168;
const CORNER_BOXES: Array<[number, number, number, number]> = [
	[34, 56, 34 + Math.floor(CORNER_FONT * 2.05), 56 + CORNER_FONT],
	[WORLD_W - 34 - Math.floor(CORNER_FONT * 2.55), WORLD_H - 64 - CORNER_FONT, WORLD_W - 34, WORLD_H - 64],
];
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export function clusterPositions(keys: string[]): Record<string, [number, number]> {
	const out: Record<string, [number, number]> = {};
	const unknown = keys.filter((k) => !CLUSTER_POS[k]);
	keys.forEach((k) => { if (CLUSTER_POS[k]) out[k] = CLUSTER_POS[k]!; });
	unknown.forEach((k, i) => {
		const th = (i / Math.max(1, unknown.length)) * Math.PI * 2 - Math.PI / 2;
		out[k] = [Math.round(WORLD_W / 2 + Math.cos(th) * 560), Math.round(WORLD_H / 2 + Math.sin(th) * 330)];
	});
	return out;
}

export interface Placeable { id: string; scenario: string; w: number; h: number; x: number; y: number }

/** 把每个 skill 摆到它所属星系周围,再做几轮矩形分离避免重叠 */
export function layoutMap<T extends Placeable>(skills: T[], pos: Record<string, [number, number]>): T[] {
	const bySc = new Map<string, T[]>();
	for (const s of skills) { const arr = bySc.get(s.scenario) ?? []; arr.push(s); bySc.set(s.scenario, arr); }
	for (const [key, members] of bySc) {
		const [cx, cy] = pos[key] ?? [WORLD_W / 2, WORLD_H / 2];
		const n = members.length;
		const radius = Math.max(232, 122 + 34 * Math.sqrt(n));
		members.forEach((s, i) => {
			const r = new Rand(seedOf(s.id + key));
			const rr = radius * Math.sqrt((i + 0.75) / n);
			const th = i * GOLDEN + r.rng(-0.34, 0.34);
			s.x = cx + rr * Math.cos(th) + r.rng(-20, 20);
			s.y = cy + rr * Math.sin(th) * 0.86 + r.rng(-20, 20);
		});
	}
	const labelRects: Array<[number, number, number, number]> = [
		...Object.values(pos).map(([cx, cy]): [number, number, number, number] => [cx - LABEL_HALF_W, cy - LABEL_HALF_H, cx + LABEL_HALF_W, cy + LABEL_HALF_H]),
		...CORNER_BOXES.map(([x0, y0, x1, y1]): [number, number, number, number] => [x0 - 14, y0 - 14, x1 + 14, y1 + 14]),
	];
	const gap = 52;
	const separate = () => {
		for (let i = 0; i < skills.length; i++) {
			const a = skills[i]!;
			for (let j = i + 1; j < skills.length; j++) {
				const b = skills[j]!;
				const dx = b.x - a.x, dy = b.y - a.y;
				const ox = (a.w + b.w) / 2 + gap - Math.abs(dx);
				const oy = (a.h + b.h) / 2 + gap - Math.abs(dy);
				if (ox <= 0 || oy <= 0) continue;
				if (ox < oy) { const push = (ox / 2) * (dx >= 0 ? 1 : -1); a.x -= push; b.x += push; }
				else { const push = (oy / 2) * (dy >= 0 ? 1 : -1); a.y -= push; b.y += push; }
			}
		}
	};
	const clamp = (s: T) => {
		const hw = s.w / 2, hh = s.h / 2;
		s.x = Math.min(Math.max(s.x, hw + 34), WORLD_W - hw - 34);
		s.y = Math.min(Math.max(s.y, hh + 34), WORLD_H - hh - 34);
	};
	for (let it = 0; it < 140; it++) {
		separate();
		for (const s of skills) {
			const hw = s.w / 2, hh = s.h / 2;
			for (const [lx0, ly0, lx1, ly1] of labelRects) {
				const lcx = (lx0 + lx1) / 2, lcy = (ly0 + ly1) / 2;
				const dx = s.x - lcx, dy = s.y - lcy;
				const ox = (lx1 - lx0) / 2 + hw - Math.abs(dx);
				const oy = (ly1 - ly0) / 2 + hh - Math.abs(dy);
				if (ox <= 0 || oy <= 0) continue;
				if (ox < oy) s.x += ox * (dx >= 0 ? 1 : -1); else s.y += oy * (dy >= 0 ? 1 : -1);
			}
			clamp(s);
		}
	}
	for (let it = 0; it < 40; it++) { separate(); skills.forEach(clamp); }
	for (const s of skills) { s.x = Math.round(s.x * 10) / 10; s.y = Math.round(s.y * 10) / 10; }
	return skills;
}
