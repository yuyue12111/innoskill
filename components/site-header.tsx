"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMeta } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
	{ href: "/", label: "星图" },
	{ href: "/skills", label: "全部技能" },
	{ href: "/presets", label: "工作区预设" },
];

export function SiteHeader() {
	const path = usePathname();
	const { data: meta } = useMeta();
	return (
		<header className="border-b border-border">
			<div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-6">
				<Link href="/" className="ink text-[24px] font-normal tracking-normal">
					Inno<span className="text-primary">skill</span>
				</Link>
				<nav className="flex items-center gap-2">
					{NAV.map((n) => {
						const active = n.href === "/" ? path === "/" : path.startsWith(n.href) || (n.href === "/skills" && path.startsWith("/skill/")) || (n.href === "/presets" && path.startsWith("/preset/"));
						return (
							<Link key={n.href} href={n.href}
								className={cn("rounded-full border px-3.5 py-1.5 text-[13px] whitespace-nowrap transition-colors",
									active ? "border-foreground bg-foreground text-white" : "border-border bg-card text-muted-foreground hover:border-[#c9c4b8] hover:text-foreground")}>
								{n.label}
							</Link>
						);
					})}
					{meta?.repo && (
						<a href={meta.repo} target="_blank" rel="noopener" className="hidden rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground sm:inline-block">
							GitHub ↗
						</a>
					)}
				</nav>
			</div>
		</header>
	);
}

export function SiteFooter() {
	const { data: meta } = useMeta();
	return (
		<footer className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-3.5 border-t border-border px-6 pt-6 pb-14 text-[12.5px] text-muted-foreground">
			<div>Innoskill · 内容来自 <a className="underline" href={meta?.repo} target="_blank" rel="noopener">inno-agent-hub</a>,经 GitHub PR 收录</div>
			<div>{meta?.lastSync ? `同步于 ${new Date(meta.lastSync.at).toLocaleString("zh-CN")} · ${meta.lastSync.sha}` : ""}</div>
		</footer>
	);
}
