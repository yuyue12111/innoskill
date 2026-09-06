/**
 * 程序化生成 riso(孔版印刷)风格的抽象图块。移植自 inno-agent-hub/scripts/riso_art.py。
 * 每个 skill 用自己的 id 做种子 → 确定性产出一张独一无二的 SVG。
 * riso 的观感来自:少量高饱和油墨色平涂;套印不准(第二层偏移 + multiply);纸张颗粒(页面级 #grain pattern)。
 */

export const INKS: Record<string, [string, string, string, string]> = {
	备课: ["#2f7d52", "#8fc9a4", "#1b4d34", "#d8e8dc"],
	讲课: ["#2f6f9e", "#8fbedd", "#17415f", "#d6e5f0"],
	自学: ["#c25a2e", "#f0a878", "#8a3a17", "#f6ddc9"],
	研究: ["#a58535", "#e0c583", "#6b5420", "#f0e5c8"],
	创造: ["#6b4d9c", "#b199d6", "#432f66", "#e3daf1"],
};
const PAPER = "#f7f4ed";
const PATTERNS = ["grid", "halftone", "waves", "blocks", "arcs", "scatter", "stripes", "linework"] as const;
type Pattern = (typeof PATTERNS)[number];
type Ink = [string, string, string, string];

/** mulberry32 —— 小巧、确定、跨语言可复现(与 Python 版逐位一致) */
export class Rand {
	private s: number;
	constructor(seed: number) { this.s = seed >>> 0; }
	next(): number {
		this.s = (this.s + 0x6d2b79f5) >>> 0;
		let t = this.s;
		t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
		t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}
	rng(a: number, b: number): number { return a + (b - a) * this.next(); }
	int(a: number, b: number): number { return Math.floor(this.rng(a, b + 1 - 1e-9)); }
	pick<T>(xs: readonly T[]): T { return xs[this.int(0, xs.length - 1)] as T; }
}

/** FNV-1a,稳定且分布好 */
export function seedOf(text: string): number {
	let h = 2166136261;
	for (const ch of text) {
		h ^= ch.codePointAt(0) ?? 0;
		h = Math.imul(h, 16777619) >>> 0;
	}
	return h >>> 0;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

function grid(r: Rand, w: number, h: number, ink: Ink): string {
	const n = r.int(4, 8), step = w / n, lines: string[] = [];
	for (let i = 0; i <= n; i++) lines.push(`<path d="M${r1(i * step)} 0V${h}"/>`);
	const m = Math.max(1, Math.floor(h / step));
	for (let i = 0; i <= m; i++) lines.push(`<path d="M0 ${r1(i * step)}H${w}"/>`);
	return `<rect width="${w}" height="${h}" fill="${ink[3]}"/><g stroke="${ink[0]}" stroke-width="${r1(r.rng(1.1, 2.2))}" fill="none">${lines.join("")}</g>`;
}
function halftone(r: Rand, w: number, h: number, ink: Ink): string {
	const step = r.rng(7, 12), dots: string[] = [];
	for (let y = step / 2; y < h; y += step) {
		for (let x = step / 2; x < w; x += step) {
			const d = Math.hypot(x - w * 0.35, y - h * 0.4) / Math.max(w, h);
			const rad = Math.max(0.6, (1.05 - d * 1.5) * step * 0.42);
			dots.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(rad)}"/>`);
		}
	}
	return `<rect width="${w}" height="${h}" fill="${ink[3]}"/><g fill="${ink[0]}">${dots.join("")}</g>`;
}
function waves(r: Rand, w: number, h: number, ink: Ink): string {
	const n = r.int(4, 8), amp = r.rng(3, 7), paths: string[] = [];
	for (let i = 0; i < n; i++) {
		const y = ((i + 0.5) * h) / n, seg = w / 4;
		let d = `M0 ${r1(y)}`;
		for (let k = 0; k < 4; k++) d += ` q${r1(seg / 2)} ${r1(k % 2 === 0 ? -amp : amp)} ${r1(seg)} 0`;
		paths.push(`<path d="${d}"/>`);
	}
	return `<rect width="${w}" height="${h}" fill="${ink[3]}"/><g stroke="${ink[0]}" stroke-width="${r1(r.rng(1.4, 2.6))}" fill="none" stroke-linecap="round">${paths.join("")}</g>`;
}
function blocks(r: Rand, w: number, h: number, ink: Ink): string {
	const cx = r1(w * r.rng(0.36, 0.62)), cy = r1(h * r.rng(0.36, 0.62));
	const quads: Array<[number, number, number, number]> = [[0, 0, cx, cy], [cx, 0, w - cx, cy], [0, cy, cx, h - cy], [cx, cy, w - cx, h - cy]];
	const cols = [ink[0], ink[1], ink[2], ink[3]];
	for (let i = cols.length - 1; i > 0; i--) { const j = r.int(0, i); [cols[i], cols[j]] = [cols[j] as string, cols[i] as string]; }
	return quads.map(([x, y, bw, bh], i) => `<rect x="${x}" y="${y}" width="${r1(bw)}" height="${r1(bh)}" fill="${cols[i]}"/>`).join("");
}
function arcs(r: Rand, w: number, h: number, ink: Ink): string {
	const cx = w * r.rng(0.1, 0.9), cy = h * r.rng(0.1, 0.9), n = r.int(3, 6), step = Math.max(w, h) / (n + 1);
	const circles = Array.from({ length: n }, (_, i) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1((i + 1) * step * 0.62)}"/>`);
	return `<rect width="${w}" height="${h}" fill="${ink[3]}"/><g stroke="${ink[0]}" stroke-width="${r1(r.rng(1.3, 2.4))}" fill="none">${circles.join("")}</g>`;
}
function scatter(r: Rand, w: number, h: number, ink: Ink): string {
	const n = r.int(14, 30), out: string[] = [];
	for (let i = 0; i < n; i++) {
		const s = r1(r.rng(2.5, 7)), x = r1(r.rng(0, w - s)), y = r1(r.rng(0, h - s));
		const c = r.next() > 0.32 ? ink[0] : ink[2];
		out.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${c}"/>`);
	}
	return `<rect width="${w}" height="${h}" fill="${ink[3]}"/>${out.join("")}`;
}
function stripes(r: Rand, w: number, h: number, ink: Ink): string {
	const sw = r1(r.rng(3.5, 7)), gap = sw * 2, paths: string[] = [];
	for (let x = -h; x < w + h; x += gap) paths.push(`<path d="M${r1(x)} ${h}L${r1(x + h)} 0"/>`);
	return `<rect width="${w}" height="${h}" fill="${ink[3]}"/><g stroke="${ink[0]}" stroke-width="${sw}">${paths.join("")}</g>`;
}
function linework(r: Rand, w: number, h: number, ink: Ink): string {
	const n = r.int(3, 6), paths: string[] = [];
	for (let i = 0; i < n; i++) {
		const x0 = r1(r.rng(0, w * 0.3)), y0 = r1(r.rng(0, h)), x1 = r1(r.rng(w * 0.7, w)), y1 = r1(r.rng(0, h));
		const cx1 = r1(r.rng(0, w)), cy1 = r1(r.rng(-h * 0.2, h * 1.2)), cx2 = r1(r.rng(0, w)), cy2 = r1(r.rng(-h * 0.2, h * 1.2));
		paths.push(`<path d="M${x0} ${y0}C${cx1} ${cy1} ${cx2} ${cy2} ${x1} ${y1}"/>`);
	}
	return `<rect width="${w}" height="${h}" fill="${ink[3]}"/><g stroke="${ink[0]}" stroke-width="${r1(r.rng(1.2, 2.2))}" fill="none" stroke-linecap="round">${paths.join("")}</g>`;
}
const RENDER: Record<Pattern, (r: Rand, w: number, h: number, ink: Ink) => string> = { grid, halftone, waves, blocks, arcs, scatter, stripes, linework };

export interface Tile { svg: string; w: number; h: number; pattern: Pattern }

/** 一张确定性的 riso 图块 */
export function makeTile(skillId: string, scenario: string): Tile {
	const r = new Rand(seedOf(skillId));
	const ink = INKS[scenario] ?? INKS["创造"]!;
	const shape = r.next();
	let w: number, h: number;
	if (shape < 0.42) { w = h = r.int(60, 80); }
	else if (shape < 0.74) { w = r.int(74, 96); h = r.int(50, 66); }
	else { w = r.int(50, 66); h = r.int(68, 90); }
	const pattern = r.pick(PATTERNS);
	const body = RENDER[pattern](r, w, h, ink);
	// 套印不准:第二层偏移色块,multiply 叠色
	const ox = r1(r.rng(-3, 3)), oy = r1(r.rng(-3, 3));
	const bw = r1(w * r.rng(0.3, 0.6)), bh = r1(h * r.rng(0.3, 0.6));
	const bx = r1(r.rng(0, w - bw)), by = r1(r.rng(0, h - bh));
	const mis = `<g transform="translate(${ox} ${oy})" style="mix-blend-mode:multiply" opacity="0.55"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${ink[1]}"/></g>`;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges"><rect width="${w}" height="${h}" fill="${PAPER}"/>${body}${mis}<rect width="${w}" height="${h}" fill="url(#grain)"/></svg>`;
	return { svg, w, h, pattern };
}
