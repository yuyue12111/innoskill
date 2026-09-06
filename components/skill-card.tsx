"use client";
import Link from "next/link";
import { colorOf, type SkillSummary } from "@/lib/types";

function Rings({ fg }: { fg: string }) {
	return (
		<svg className="rings pointer-events-none absolute -top-[58px] -right-[58px] h-[190px] w-[190px] opacity-45" viewBox="0 0 100 100" fill="none" stroke={fg} strokeWidth="1.4">
			<circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="34" /><circle cx="50" cy="50" r="22" /><circle cx="50" cy="50" r="11" />
		</svg>
	);
}

export function Badges({ s }: { s: SkillSummary }) {
	const items: Array<{ text: string; cls: string }> = [];
	if (s.type === "原创") items.push({ text: "原创", cls: "bg-[#efe6d4] text-[#7a5c1e] border-[#e2d3b4]" });
	if (s.verified) items.push({ text: "✓ 已验证", cls: "bg-[#e2f0e6] text-primary border-[#c6e2ce]" });
	if (!items.length) items.push({ text: s.type || "收集", cls: "text-muted-foreground border-border" });
	return (
		<div className="flex shrink-0 gap-1.5">
			{items.map((b) => <span key={b.text} className={`rounded-full border px-[7px] py-[2.5px] text-[10px] font-bold whitespace-nowrap ${b.cls}`}>{b.text}</span>)}
		</div>
	);
}

export function SkillCard({ s }: { s: SkillSummary }) {
	const { bg, fg } = colorOf(s.category);
	return (
		<Link href={`/skill/${encodeURIComponent(s.id)}`} className="gcard flex flex-col overflow-hidden border border-border bg-card">
			<div className="cover relative flex min-h-[172px] flex-col justify-between gap-3.5 overflow-hidden p-4" style={{ background: bg, color: s.hasDemo ? "#fff" : fg }}>
				{s.hasDemo ? (
					<>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img className="demoImg absolute inset-0 block h-full w-full object-cover" src={s.demo} alt={`${s.name} 演示`} loading="lazy" />
						<div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.62)_0%,rgba(0,0,0,.18)_52%,rgba(0,0,0,.3)_100%)]" />
					</>
				) : <Rings fg={fg} />}
				<div className="relative flex items-start justify-between gap-2.5">
					<div className={`pt-1 text-[9.5px] font-bold tracking-[.12em] uppercase ${s.hasDemo ? "opacity-90 [text-shadow:0_1px_14px_rgba(0,0,0,.55)]" : "opacity-60"}`}>Inno / Skill {s.num}</div>
					<div className={`num shrink-0 text-[34px] leading-[.85] font-extrabold tracking-[-.04em] ${s.hasDemo ? "[text-shadow:0_1px_14px_rgba(0,0,0,.55)]" : ""}`}>{s.num}</div>
				</div>
				<div className="relative min-w-0">
					<div className={`text-[19px] leading-[1.08] font-extrabold tracking-[-.03em] [overflow-wrap:anywhere] ${s.hasDemo ? "[text-shadow:0_1px_14px_rgba(0,0,0,.55)]" : ""}`}>{s.name}</div>
					<div className={`mt-[7px] text-[9.5px] font-bold tracking-[.1em] uppercase ${s.hasDemo ? "opacity-90" : "opacity-70"}`}>{s.category}</div>
					{!s.hasDemo && (
						<div className="bars mt-2 flex h-[15px] items-end gap-[2.5px]">
							{[7, 11, 15, 9].map((h, i) => <i key={i} className="block w-[3.5px] rounded-[1px] bg-current opacity-55" style={{ height: h }} />)}
						</div>
					)}
				</div>
				{s.hasDemo && <span className="absolute right-3.5 bottom-3.5 z-[2] rounded-[3px] bg-black/70 px-[7px] py-[3px] text-[9.5px] font-extrabold tracking-[.08em] text-white">▶ DEMO</span>}
			</div>
			<div className="flex flex-1 flex-col gap-2 p-[18px]">
				<div className="flex items-center justify-between gap-2.5">
					<div className="truncate text-[10px] font-bold tracking-[.1em] text-muted-foreground uppercase">{s.refText || "inno-agent-hub"}</div>
					<Badges s={s} />
				</div>
				<div className="iname text-[18px] leading-[1.15] font-extrabold tracking-[-.025em] break-words">{s.name}</div>
				<div className="min-h-[3em] flex-1 text-[13px] leading-[1.55] text-[#4b483f]">{s.tagline}</div>
				<div className="mt-1 flex items-center justify-between">
					<b className="text-[13px] font-bold text-primary">查看详情</b>
					<span className="arrow grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-primary text-sm text-white">→</span>
				</div>
			</div>
		</Link>
	);
}
