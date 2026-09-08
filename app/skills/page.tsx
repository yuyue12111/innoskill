"use client";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { SkillCard } from "@/components/skill-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeta, usePacks, useSkills } from "@/lib/api";
import { PresetIcon } from "@/components/preset-icon";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SkillsPage() {
	return (
		<>
			<SiteHeader />
			<Suspense fallback={<main className="mx-auto max-w-[1240px] px-6 py-16"><Skeleton className="h-24 w-2/3" /></main>}>
				<SkillsBrowser />
			</Suspense>
			<SiteFooter />
		</>
	);
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button type="button" aria-pressed={active} onClick={onClick}
			className={cn("rounded-full border px-[15px] py-2 text-[12.5px] font-semibold transition-all hover:-translate-y-0.5",
				active ? "border-foreground bg-foreground text-white" : "border-border bg-card text-muted-foreground hover:border-[#b9b3a5] hover:text-foreground")}>
			{children}
		</button>
	);
}

function FacetSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ name: string; count: number }>; onChange: (v: string) => void }) {
	return (
		<label className={cn("inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
			value ? "border-foreground bg-foreground text-white" : "border-border bg-card text-muted-foreground hover:border-[#b9b3a5] hover:text-foreground")}>
			<span>{label}</span>
			<select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
				className="max-w-[9em] cursor-pointer appearance-none bg-transparent pr-3 font-semibold outline-none [color-scheme:light]"
				style={{ color: value ? "#fff" : "inherit" }}>
				<option value="" style={{ color: "#14140f" }}>全部</option>
				{options.map((o) => <option key={o.name} value={o.name} style={{ color: "#14140f" }}>{o.name} ({o.count})</option>)}
			</select>
			<span aria-hidden className="-ml-3 text-[10px]">▾</span>
		</label>
	);
}

function SkillsBrowser() {
	const sp = useSearchParams(); const router = useRouter(); const path = usePathname();
	const q = sp.get("q") ?? "", category = sp.get("category") ?? "", scenario = sp.get("scenario") ?? "", featured = sp.get("featured") === "1", pack = sp.get("pack") ?? "", subject = sp.get("subject") ?? "", kind = sp.get("kind") ?? "";
	const [draft, setDraft] = useState(q);
	// URL 里的 q 变了(前进/后退、清除),把输入框同步过去 —— 渲染期调整状态,不走 effect
	const [seenQ, setSeenQ] = useState(q);
	if (q !== seenQ) { setSeenQ(q); setDraft(q); }

	const setParams = (patch: Record<string, string>) => {
		const next = new URLSearchParams(sp.toString());
		for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
		router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
	};
	// 边打边搜,250ms 防抖
	useEffect(() => {
		const t = setTimeout(() => { if (draft.trim() !== q) setParams({ q: draft.trim() }); }, 250);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [draft]);

	const { data: meta } = useMeta();
	const { data: packs } = usePacks();
	const { data, isLoading } = useSkills({ q, category, scenario, featured, pack, subject, kind });
	const list = data?.items ?? [];
	const packName = packs?.items.find((p) => p.id === pack)?.name;
	const filters = [featured && "精选", pack && `技能包:${packName ?? pack}`, category, scenario, subject && `学科:${subject}`, kind && `用途:${kind}`, q && `“${q}”`].filter(Boolean);

	return (
		<main className="mx-auto max-w-[1240px] px-6">
			<section className="grid items-end gap-8 pt-16 pb-10 max-lg:grid-cols-1 max-lg:items-start max-lg:gap-5 max-lg:pt-12 lg:grid-cols-[1.5fr_1fr]">
				<div>
					<div className="label">Start here</div>
					<h1 className="mt-3.5 text-[clamp(44px,7.5vw,104px)] leading-[.95] font-extrabold tracking-[-.035em]">为教学而生<br />的技能库</h1>
					<form className="mt-8 flex max-w-[540px] items-stretch border-b-[1.5px] border-foreground transition-colors focus-within:border-primary" role="search"
						onSubmit={(e) => { e.preventDefault(); setParams({ q: draft.trim() }); }}>
						<Input value={draft} onChange={(e) => setDraft(e.target.value)} type="search" autoComplete="off"
							placeholder="你的 agent 需要学会什么?试试「批改作文」「立体几何」" aria-label="搜索技能"
							className="h-auto flex-1 rounded-none border-0 bg-transparent px-0.5 py-3 text-[15px] shadow-none focus-visible:ring-0" />
						<button type="submit" className="bg-[#a8ccb0] px-6 text-[13.5px] font-bold text-foreground transition hover:bg-[#93bf9e] active:scale-[.97]">搜索</button>
					</form>
					<div className="mt-2 text-xs text-muted-foreground">支持按名称、分类、用途和<b>触发词</b>全文搜索</div>
				</div>
				<div>
					<p className="max-w-[38ch] text-[15px] text-muted-foreground">可直接调用的具体能力:备课、批改、讲题、创作、研究。在 InnoAgent 的技能库里一键导入就能用。</p>
					<div className="mt-5 flex flex-wrap gap-6">
						{[[meta?.count.skills, "技能"], [meta?.categories.length, "分类"], [meta?.scenarios.length, "场景"], [meta?.count.presets, "工作区预设"]].map(([n, l]) => (
							<div key={l as string}><b className="ink block text-[36px] font-normal tracking-normal">{n ?? "–"}</b><span className="text-[11px] tracking-[.1em] text-muted-foreground uppercase">{l}</span></div>
						))}
					</div>
				</div>
			</section>

			{!q && !pack && !!packs?.items.length && (
				<section className="border-t border-border pt-14 pb-4">
					<div className="flex flex-wrap items-end justify-between gap-4 pb-5">
						<div>
							<div className="label">Skill packs</div>
							<h2 className="mt-3 text-[clamp(28px,4vw,48px)] leading-[.98] font-extrabold tracking-[-.03em]">学科技能包</h2>
						</div>
						<p className="max-w-[44ch] text-[13.5px] text-muted-foreground">严选的技能组合,按用途打包。在 InnoAgent 里可以一键添加整包。</p>
					</div>
					<div className="grid grid-cols-3 gap-3.5 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
						{packs.items.map((p) => (
							<Link key={p.id} href={`/skills?pack=${encodeURIComponent(p.id)}`} className="gcard flex flex-col gap-3 border border-border bg-card p-5">
								<div className="flex items-center justify-between">
									<span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8f0ea] text-primary"><PresetIcon name={p.icon} className="h-5 w-5" /></span>
									<span className="text-[11.5px] font-normal tracking-[.12em] text-muted-foreground uppercase">{p.skillCount} skills{p.installCount > 0 ? ` · ${p.installCount} 人在用` : ""}</span>
								</div>
								<div className="iname text-[18px] leading-[1.2] font-extrabold tracking-[-.02em]">{p.name}</div>
								<div className="flex-1 text-[13px] leading-[1.55] text-[#4b483f]">{p.description}</div>
								<div className="mt-1 flex items-center justify-between"><b className="text-[13px] font-bold text-primary">看包里的技能</b><span className="arrow grid h-[30px] w-[30px] place-items-center rounded-full bg-primary text-sm text-white">→</span></div>
							</Link>
						))}
					</div>
				</section>
			)}

			<div className="flex flex-wrap items-end justify-between gap-5 border-t border-border pt-14 pb-5">
				<div>
					<div className="label">The library</div>
					<h2 className="mt-3 text-[clamp(34px,5.5vw,72px)] leading-[.95] font-extrabold tracking-[-.035em]">{pack && packName ? packName : "全部技能"}</h2>
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap gap-[7px]">
						<Pill active={!category && !featured} onClick={() => setParams({ category: "", featured: "" })}>全部 {meta?.count.skills ?? ""}</Pill>
						{!!meta?.count.featured && <Pill active={featured} onClick={() => setParams({ featured: featured ? "" : "1" })}>★ 精选 {meta.count.featured}</Pill>}
						{meta?.categories.map((c) => <Pill key={c.name} active={category === c.name} onClick={() => setParams({ category: category === c.name ? "" : c.name })}>{c.name} {c.count}</Pill>)}
					</div>
					<div className="flex flex-wrap items-center gap-[7px]">
						<FacetSelect label="学科" value={subject} options={meta?.subjects ?? []} onChange={(v) => setParams({ subject: v })} />
						<FacetSelect label="用途" value={kind} options={meta?.kinds ?? []} onChange={(v) => setParams({ kind: v })} />
						<span className="mx-1 h-4 w-px bg-border" aria-hidden />
						{meta?.scenarios.map((s) => (
							<button key={s.key} type="button" aria-pressed={scenario === s.key} onClick={() => setParams({ scenario: scenario === s.key ? "" : s.key })}
								className="rounded-full border px-3 py-1.5 text-[12px] font-bold tracking-[.06em] transition-all hover:-translate-y-0.5"
								style={scenario === s.key ? { background: s.color.fg, color: "#fff", borderColor: s.color.fg } : { background: s.color.bg, color: s.color.ink, borderColor: s.color.bg }}>
								{s.key} {s.count}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="py-3.5 pb-[18px] text-[12.5px] text-muted-foreground">
				{isLoading && !data ? "加载中…" : `${data?.total ?? 0} 个技能`}
				{filters.length > 0 && <> · {filters.join(" · ")} &nbsp;<button type="button" className="font-bold text-primary underline" onClick={() => { setDraft(""); router.replace(path, { scroll: false }); }}>清除</button></>}
			</div>

			{isLoading && !data ? (
				<div className="grid grid-cols-3 gap-3.5 pb-20 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[340px]" />)}</div>
			) : list.length ? (
				<section className="grid grid-cols-3 gap-3.5 pb-20 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
					{list.map((s) => <SkillCard key={s.id} s={s} />)}
				</section>
			) : (
				<div className="py-12 pb-20 text-sm text-muted-foreground">没有匹配的技能{q ? `:「${q}」` : ""}。换个词,或点上面的分类看看。</div>
			)}
		</main>
	);
}
