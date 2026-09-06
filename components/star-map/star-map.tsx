"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CopyButton } from "@/components/copy-button";
import { useMap } from "@/lib/api";
import type { MapData, MapSkill } from "@/lib/types";
import "./star-map.css";

export function StarMap() {
	const { data, error } = useMap();
	if (error) return <div className="sm-root grid place-items-center text-sm text-muted-foreground">星图加载失败:{error.message}</div>;
	if (!data) return <div className="sm-root" />;
	return <StarMapView data={data} />;
}

type Highlight = { kind: "sc"; key: string } | { kind: "skill"; id: string } | null;
type Phase = "intro" | "armed" | "open";
const MAX_K = 3.2;

function StarMapView({ data }: { data: MapData }) {
	const vpRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const cornerA = useRef<HTMLDivElement>(null);
	const cornerB = useRef<HTMLDivElement>(null);
	const zoomApi = useRef<{ zoom: (f: number) => void } | null>(null);
	const [phase, setPhase] = useState<Phase>("intro");
	const [cue, setCue] = useState<"hidden" | "in" | "out">("hidden");
	const [zoomable, setZoomable] = useState({ in: true, out: true });
	const [hl, setHl] = useState<Highlight>(null);
	const [sel, setSel] = useState<MapSkill | null>(null);

	const SC = useMemo(() => Object.fromEntries(data.scenarios.map((s) => [s.key, s])), [data]);
	const byId = useMemo(() => new Map(data.skills.map((s) => [s.id, s])), [data]);

	/* 哪些图块 / 星系 / 连线该亮 */
	const lit = useMemo(() => {
		const tiles = new Set<string>(), clusters = new Set<string>();
		let wireTest: (skillId: string, sc: string) => boolean = () => false;
		if (hl?.kind === "sc") {
			clusters.add(hl.key);
			for (const s of data.skills) if (s.scenario === hl.key || s.also.includes(hl.key)) tiles.add(s.id);
			wireTest = (_id, sc) => sc === hl.key;
		} else if (hl?.kind === "skill") {
			const s = byId.get(hl.id);
			tiles.add(hl.id);
			if (s) [s.scenario, ...s.also].forEach((k) => clusters.add(k));
			wireTest = (id) => id === hl.id;
		}
		return { tiles, clusters, wireTest };
	}, [hl, data, byId]);

	/* 平移缩放 + 开场,全部命令式,只碰 React 不管的属性(stage transform / corner transform) */
	useEffect(() => {
		const vp = vpRef.current, stg = stageRef.current, a = cornerA.current, b = cornerB.current;
		if (!vp || !stg || !a || !b) return;
		const W = data.world.w, H = data.world.h;
		const view = { x: 0, y: 0, k: 1 };
		let MIN_K = 0.3, fitted = false, introPlayed = false, opened = false, armedForEnter = false;
		let lastZoomable = { in: true, out: true };
		const timers: ReturnType<typeof setTimeout>[] = [];
		const box = () => vp.getBoundingClientRect();
		const clampView = () => {
			const bx = box(), w = W * view.k, h = H * view.k, padX = bx.width * 0.12, padY = bx.height * 0.12;
			const loX = bx.width - padX - w, hiX = padX;
			view.x = loX > hiX ? (bx.width - w) / 2 : Math.min(hiX, Math.max(loX, view.x));
			const loY = bx.height - padY - h, hiY = padY;
			view.y = loY > hiY ? (bx.height - h) / 2 : Math.min(hiY, Math.max(loY, view.y));
		};
		const apply = () => {
			if (!fitted) return;
			clampView();
			stg.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
			const z = { in: view.k < MAX_K - 1e-3, out: view.k > MIN_K + 1e-3 };
			if (z.in !== lastZoomable.in || z.out !== lastZoomable.out) { lastZoomable = z; setZoomable(z); }
		};
		const zoomAt = (cx: number, cy: number, factor: number) => {
			const k = Math.min(MAX_K, Math.max(MIN_K, view.k * factor)), r = k / view.k;
			view.x = cx - (cx - view.x) * r; view.y = cy - (cy - view.y) * r; view.k = k; apply();
		};
		zoomApi.current = { zoom: (f) => { const bx = box(); zoomAt(bx.width / 2, bx.height / 2, f); } };

		const enterMap = () => {
			if (opened || !armedForEnter) return; opened = true;
			setCue("out");
			a.style.transform = ""; b.style.transform = "";
			setPhase("open");
			ENTER_EVENTS.forEach((ev) => removeEventListener(ev, enterMap));
		};
		const ENTER_EVENTS = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
		const playIntro = () => {
			const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, bx = box();
			if (reduce || bx.width < 2) { opened = true; armedForEnter = true; setPhase("open"); return; }
			const ra = { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight };
			const rb = { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
			const gap = 42, total = ra.w + gap + rb.w;
			const S = Math.max(1, Math.min(2.8, (bx.width * 0.58) / (total * view.k)));
			const cx = bx.width / 2, cy = bx.height / 2;
			const sAx = cx - (total * view.k * S) / 2 + (ra.w * view.k * S) / 2;
			const sBx = cx + (total * view.k * S) / 2 - (rb.w * view.k * S) / 2;
			const toWorldX = (sx: number) => (sx - view.x) / view.k, wY = (cy - view.y) / view.k;
			const dA = { x: toWorldX(sAx) - (ra.x + ra.w / 2), y: wY - (ra.y + ra.h / 2) };
			const dB = { x: toWorldX(sBx) - (rb.x + rb.w / 2), y: wY - (rb.y + rb.h / 2) };
			a.style.transition = "none"; b.style.transition = "none";
			a.style.transform = `translate(${dA.x}px, ${dA.y}px) scale(${S})`;
			b.style.transform = `translate(${dB.x}px, ${dB.y}px) scale(${S})`;
			void stg.offsetWidth;
			a.style.transition = ""; b.style.transition = "";
			setPhase("armed"); setCue("in");
			timers.push(setTimeout(() => {
				armedForEnter = true;
				ENTER_EVENTS.forEach((ev) => addEventListener(ev, enterMap, { passive: true }));
			}, 400));
		};
		const fit = () => {
			const bx = box();
			if (bx.width < 2 || bx.height < 2) return;
			view.k = Math.min(bx.width / W, bx.height / H) * 0.94;
			MIN_K = view.k;
			view.x = (bx.width - W * view.k) / 2; view.y = (bx.height - H * view.k) / 2;
			fitted = true; apply();
			if (!introPlayed) { introPlayed = true; playIntro(); }
		};

		let down = false, px = 0, py = 0;
		const onDown = (e: PointerEvent) => {
			if ((e.target as Element).closest(".sm-tile, .sm-cluster")) return;
			down = true; px = e.clientX; py = e.clientY; vp.classList.add("dragging"); vp.setPointerCapture(e.pointerId);
		};
		const onMove = (e: PointerEvent) => { if (!down) return; view.x += e.clientX - px; view.y += e.clientY - py; px = e.clientX; py = e.clientY; apply(); };
		const onUp = (e: PointerEvent) => { down = false; vp.classList.remove("dragging"); try { vp.releasePointerCapture(e.pointerId); } catch { /* */ } };
		const onWheel = (e: WheelEvent) => {
			if (!opened) return;
			e.preventDefault();
			const f = Math.exp(-e.deltaY * 0.0012);
			zoomAt(e.clientX, e.clientY, Math.max(0.9, Math.min(1.11, f)));
		};
		// 尺寸变了:没 fit 过就补 fit;fit 过则重算"刚好铺满"的下限,视口变大时别让图缩成一小团
		const onResize = () => {
			if (!fitted) return fit();
			const bx = box();
			if (bx.width < 2 || bx.height < 2) return;
			MIN_K = Math.min(bx.width / W, bx.height / H) * 0.94;
			if (view.k < MIN_K) view.k = MIN_K;
			apply();
		};
		vp.addEventListener("pointerdown", onDown); vp.addEventListener("pointermove", onMove);
		vp.addEventListener("pointerup", onUp); vp.addEventListener("pointercancel", onUp);
		vp.addEventListener("wheel", onWheel, { passive: false });
		addEventListener("resize", onResize);
		const ro = new ResizeObserver(() => { if (!fitted) fit(); }); ro.observe(vp);
		const io = new IntersectionObserver((es) => { if (!fitted && es.some((x) => x.isIntersecting)) fit(); }); io.observe(vp);

		fit();
		requestAnimationFrame(() => { if (!fitted) fit(); });
		[120, 400, 1200].forEach((d) => timers.push(setTimeout(() => { if (!fitted) fit(); }, d)));
		timers.push(setTimeout(() => {
			if (!introPlayed) { introPlayed = true; playIntro(); }
			if (!fitted) { armedForEnter = true; enterMap(); }
		}, 2600));

		return () => {
			vp.removeEventListener("pointerdown", onDown); vp.removeEventListener("pointermove", onMove);
			vp.removeEventListener("pointerup", onUp); vp.removeEventListener("pointercancel", onUp);
			vp.removeEventListener("wheel", onWheel); removeEventListener("resize", onResize);
			ENTER_EVENTS.forEach((ev) => removeEventListener(ev, enterMap));
			ro.disconnect(); io.disconnect(); timers.forEach(clearTimeout);
		};
	}, [data]);

	const open = phase === "open";
	const selSc = sel ? SC[sel.scenario] : undefined;

	return (
		<div className="sm-root">
			<header className={`sm-header${open ? " in" : ""}`}>
				<Link href="/" className="sm-logo">Inno<span>skill</span></Link>
				<nav className="sm-nav">
					<Link className="sm-nlink" href="/presets">工作区预设</Link>
					<a className="sm-nlink" href={data.repo} target="_blank" rel="noopener">GitHub ↗</a>
					<Link className="sm-nlink solid" href="/skills">浏览全部技能 →</Link>
				</nav>
			</header>

			<div ref={vpRef} className="sm-viewport">
				<div ref={stageRef} className={`sm-stage ${phase === "intro" ? "intro" : phase === "armed" ? "intro armed" : "armed"}${hl ? " dim" : ""}`}
					style={{ width: data.world.w, height: data.world.h }}
					onPointerOver={(e) => {
						const c = (e.target as Element).closest<HTMLElement>(".sm-cluster");
						if (c?.dataset.sc) return setHl({ kind: "sc", key: c.dataset.sc });
						const t = (e.target as Element).closest<HTMLElement>(".sm-tile");
						if (t?.dataset.id) return setHl({ kind: "skill", id: t.dataset.id });
					}}
					onPointerOut={(e) => {
						const rt = e.relatedTarget as Element | null;
						if (!rt || !rt.closest?.(".sm-cluster, .sm-tile")) setHl(null);
					}}>
					<svg className="sm-wires" width={data.world.w} height={data.world.h} viewBox={`0 0 ${data.world.w} ${data.world.h}`}>
						{data.skills.flatMap((s) => [s.scenario, ...s.also].map((key, i) => {
							const c = SC[key]; if (!c) return null;
							return <line key={`${s.id}-${key}`} className={`sm-wire${i ? " alt" : ""}${lit.wireTest(s.id, key) ? " lit" : ""}`}
								style={{ "--sc": c.color.fg } as CSSProperties} x1={c.x} y1={c.y} x2={s.x} y2={s.y} />;
						}))}
					</svg>
					<div ref={cornerA} className="sm-corner sm-cornerA serif">Inno</div>
					<div ref={cornerB} className="sm-corner sm-cornerB serif">Agent</div>
					<div className="sm-nodes">
						{data.scenarios.map((c) => (
							<div key={c.key} className={`sm-cluster${lit.clusters.has(c.key) ? " on" : ""}`} data-sc={c.key}
								style={{ left: c.x, top: c.y - 66, "--sc": c.color.fg } as CSSProperties}
								onClick={() => { const first = data.skills.find((s) => s.scenario === c.key); if (first) setSel(first); }}>
								<h2 className="serif">{c.title}</h2>
								<p>{c.blurb}</p>
								<span className="cnt" style={{ background: c.color.bg, color: c.color.ink }}>{c.count} 个技能</span>
							</div>
						))}
						{data.skills.map((s) => (
							<button key={s.id} type="button" className={`sm-tile${lit.tiles.has(s.id) ? " on" : ""}`} data-id={s.id}
								style={{ left: s.x - s.w / 2, top: s.y - s.h / 2, "--fx": `${s.fx}px`, "--fy": `${s.fy}px`, "--rot": `${s.rot}deg`, "--dur": `${s.dur}s`, "--delay": `${s.delay}s` } as CSSProperties}
								title={s.name} aria-label={`${s.name}:${s.tagline}`} onClick={() => setSel(s)}>
								<span dangerouslySetInnerHTML={{ __html: s.svg }} />
								{s.hasDemo && <span className="dtag">DEMO</span>}
								{s.verified && <span className="vtag">✓</span>}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className={`sm-cue${cue === "in" ? " in" : cue === "out" ? " out" : ""}`}>向下滚动,进入技能星图 <i>↓</i></div>
			<div className={`sm-hud sm-hint${open ? " in" : ""}`}>点击任意图块,看它能帮你做什么</div>
			<div className={`sm-hud sm-zoom${open ? " in" : ""}`}>
				缩放 <button type="button" aria-label="放大" disabled={!zoomable.in} onClick={() => zoomApi.current?.zoom(1.22)}>+</button>
				<button type="button" aria-label="缩小" disabled={!zoomable.out} onClick={() => zoomApi.current?.zoom(1 / 1.22)}>−</button>
			</div>

			<Dialog open={!!sel} onOpenChange={(o) => { if (!o) setSel(null); }}>
				<DialogContent showCloseButton={false} className="w-auto max-w-none border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-none">
					{sel && (
						<div className="sm-detail">
							<div className={`sm-bigart${!sel.hasDemo && sel.h > sel.w ? " portrait" : ""}`}>
								{sel.hasDemo
									// eslint-disable-next-line @next/next/no-img-element
									? <img src={sel.demo} alt={`${sel.name} 演示`} loading="lazy" decoding="async" />
									: <span dangerouslySetInnerHTML={{ __html: sel.svg }} />}
							</div>
							<div className="sm-dcard">
								<button type="button" onClick={() => setSel(null)} aria-label="关闭" className="absolute top-3 right-3 h-[26px] w-[26px] rounded-full bg-[#eeebe4] text-[15px] leading-none text-[#4b483f] hover:bg-[#e2ded6]">×</button>
								{selSc && <span className="inline-block rounded-full px-[9px] py-[3px] text-[10.5px] font-extrabold tracking-[.1em]" style={{ background: selSc.color.bg, color: selSc.color.ink }}>{sel.scenario}</span>}
								<DialogTitle className="serif mt-2.5 pr-5 text-[23px] leading-[1.2] font-semibold tracking-[-.02em] break-words">{sel.name}</DialogTitle>
								<div className="mt-2 text-[13.5px] leading-[1.6] text-[#4b483f]">{sel.tagline}</div>
								<div className="mt-2.5 text-[11.5px] text-muted-foreground">属于:{[selSc?.title, ...sel.also.map((k) => SC[k]?.title)].filter(Boolean).join(" · ")}</div>
								<div className="mt-4 overflow-hidden rounded-[9px] border border-border bg-[#f4f2ec]">
									<div className="flex items-center justify-between gap-2.5 border-b border-border bg-[#efece4] px-3 py-2">
										<span className="text-[10.5px] font-extrabold tracking-[.09em] text-muted-foreground">试试这句话</span>
										<CopyButton text={sel.example} />
									</div>
									<div className="p-[13px] text-[13.5px] leading-[1.68] text-[#26241d] break-words">{sel.example}</div>
								</div>
								<div className="mt-3 flex items-center justify-between gap-3">
									<Link href={`/skill/${encodeURIComponent(sel.id)}`} className="text-[12.5px] font-bold text-primary hover:underline">查看详情 &amp; 安装 →</Link>
									<span className="truncate text-[10.5px] tracking-[.06em] text-muted-foreground">{sel.refText || "inno-agent-hub"}</span>
								</div>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
