"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Markdown } from "@/components/markdown";
import { PresetIcon } from "@/components/preset-icon";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rawFileUrl, useMeta, usePreset, usePresetFile } from "@/lib/api";
import { presetSourceUrl } from "@/lib/types";

const fmt = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export default function PresetPage() {
	const { id } = useParams<{ id: string }>();
	const { data: p, error, isLoading } = usePreset(id);
	const { data: meta } = useMeta();
	const hasAgent = !!p?.files.some((f) => f.path === "agent.md");
	const hasReadme = !!p?.files.some((f) => f.path === "README.md");
	const { data: agent } = usePresetFile(hasAgent ? id : null, "agent.md");
	const { data: readme } = usePresetFile(hasReadme ? id : null, "README.md");
	const skills = p?.files.filter((f) => /^\.skills\/[^/]+\/SKILL\.md$/.test(f.path)).map((f) => f.path.split("/")[1]!) ?? [];

	return (
		<>
			<SiteHeader />
			<main className="mx-auto max-w-[1240px] px-6 pt-10 pb-20">
				<Link href="/presets" className="text-[13px] text-muted-foreground hover:text-foreground">← 工作区预设</Link>
				{error && <div className="py-20 text-center text-muted-foreground">找不到这个预设:{id}</div>}
				{isLoading && !p && <div className="mt-6 space-y-4"><Skeleton className="h-14 w-2/3" /><Skeleton className="h-6 w-1/2" /><Skeleton className="mt-8 h-96 w-full" /></div>}
				{p && (
					<>
						<header className="mt-5 flex items-start gap-5">
							<span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#e8f0ea] text-primary"><PresetIcon name={p.icon} className="h-7 w-7" /></span>
							<div>
								<h1 className="serif ink text-[clamp(32px,4.8vw,54px)] leading-[1.08] font-normal tracking-normal">{p.name}</h1>
								<p className="mt-3 max-w-[62ch] text-[15.5px] leading-[1.65] text-[#4b483f]">{p.description}</p>
								<div className="mt-3 text-[13.5px] tracking-[.08em] text-muted-foreground uppercase">preset · {p.id}{skills.length > 0 && ` · 内置 ${skills.length} 个私有技能`}</div>
							</div>
						</header>
						<div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
							<section className="min-w-0">
								<Tabs defaultValue={hasReadme ? "readme" : "agent"}>
									<TabsList>
										{hasReadme && <TabsTrigger value="readme">README</TabsTrigger>}
										{hasAgent && <TabsTrigger value="agent">agent.md(工作区上下文)</TabsTrigger>}
										<TabsTrigger value="files">文件({p.files.length})</TabsTrigger>
									</TabsList>
									{hasReadme && <TabsContent value="readme" className="mt-4 rounded-xl border border-border bg-card p-6 sm:p-8">{readme ? <Markdown source={readme.content} resolveUrl={(rel) => rawFileUrl("presets", p.id, rel)} /> : <Skeleton className="h-40" />}</TabsContent>}
									{hasAgent && <TabsContent value="agent" className="mt-4 rounded-xl border border-border bg-card p-6 sm:p-8">{agent ? <Markdown source={agent.content} resolveUrl={(rel) => rawFileUrl("presets", p.id, rel)} /> : <Skeleton className="h-40" />}</TabsContent>}
									<TabsContent value="files" className="mt-4 rounded-xl border border-border bg-card">
										<ul className="divide-y divide-border text-[13px]">
											{p.files.map((f) => (
												<li key={f.path} className="flex items-center justify-between gap-4 px-5 py-2.5">
													<a className="truncate text-[14px] hover:text-primary hover:underline" href={rawFileUrl("presets", p.id, f.path)} target="_blank" rel="noopener">{f.path}</a>
													<span className="shrink-0 text-muted-foreground">{fmt(f.size)}</span>
												</li>
											))}
										</ul>
									</TabsContent>
								</Tabs>
							</section>
							<aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
								<div className="rounded-xl border border-border bg-card p-5">
									<div className="text-[10.5px] font-extrabold tracking-[.09em] text-muted-foreground">在 InnoAgent 中使用</div>
									<ol className="mt-3 list-decimal space-y-2 pl-5 text-[13.5px] leading-[1.6]">
										<li>打开 Inno Agent,切到<b>简单模式</b></li>
										<li>欢迎页选择「{p.name}」预设卡片</li>
										<li>它会实例化成一个可编辑的新工作区</li>
									</ol>
									<a href={p.bundleUrl} className="mt-4 flex items-center justify-between rounded-full bg-primary px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#175a3b]">下载预设包 .tar.gz <span>↓</span></a>
								</div>
								{skills.length > 0 && (
									<div className="rounded-xl border border-border bg-card p-5 text-[13px]">
										<div className="text-[10.5px] font-extrabold tracking-[.09em] text-muted-foreground">内置私有技能</div>
										<ul className="mt-3 space-y-1.5 text-[14px]">{skills.map((s) => <li key={s}>{s}</li>)}</ul>
									</div>
								)}
								<div className="rounded-xl border border-border bg-card p-5 text-[13px]">
									<div className="text-[10.5px] font-extrabold tracking-[.09em] text-muted-foreground">preset.json</div>
									<pre className="mt-3 overflow-x-auto rounded-lg bg-foreground p-3 text-[11.5px] leading-relaxed text-[#ece9df]">{JSON.stringify(p.meta, null, 2)}</pre>
									<div className="mt-2 flex justify-end"><CopyButton text={JSON.stringify(p.meta, null, 2)} /></div>
									{meta && <a className="mt-3 block text-primary hover:underline" href={presetSourceUrl(meta.repo, p.id)} target="_blank" rel="noopener">在 inno-agent-hub 查看源码 ↗</a>}
								</div>
							</aside>
						</div>
					</>
				)}
			</main>
			<SiteFooter />
		</>
	);
}
