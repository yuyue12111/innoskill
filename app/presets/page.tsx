"use client";
import Link from "next/link";
import { PresetIcon } from "@/components/preset-icon";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { usePresets } from "@/lib/api";

export default function PresetsPage() {
	const { data, isLoading } = usePresets();
	return (
		<>
			<SiteHeader />
			<main className="mx-auto max-w-[1240px] px-6">
				<section className="pt-16 pb-10">
					<div className="label">Workspace presets</div>
					<h1 className="mt-3.5 text-[clamp(40px,6.5vw,88px)] leading-[.95] font-extrabold tracking-[-.035em]">工作区预设</h1>
					<p className="mt-5 max-w-[52ch] text-[15px] text-muted-foreground">一套预先配好的工作区:带上下文、带私有技能,在 Inno Agent 简单模式里一键打开就是一个能干活的助手。</p>
				</section>
				{isLoading && !data ? (
					<div className="grid grid-cols-3 gap-3.5 pb-20 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[180px]" />)}</div>
				) : (
					<section className="grid grid-cols-3 gap-3.5 pb-20 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
						{data?.items.map((p) => (
							<Link key={p.id} href={`/preset/${encodeURIComponent(p.id)}`} className="gcard flex flex-col gap-3 border border-border bg-card p-5">
								<div className="flex items-center justify-between">
									<span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8f0ea] text-primary"><PresetIcon name={p.icon} className="h-5 w-5" /></span>
									<span className="text-[10px] font-bold tracking-[.1em] text-muted-foreground uppercase">preset</span>
								</div>
								<div className="iname text-[18px] leading-[1.2] font-extrabold tracking-[-.02em]">{p.name}</div>
								<div className="flex-1 text-[13px] leading-[1.55] text-[#4b483f]">{p.description}</div>
								<div className="mt-1 flex items-center justify-between"><b className="text-[13px] font-bold text-primary">查看详情</b><span className="arrow grid h-[30px] w-[30px] place-items-center rounded-full bg-primary text-sm text-white">→</span></div>
							</Link>
						))}
					</section>
				)}
			</main>
			<SiteFooter />
		</>
	);
}
