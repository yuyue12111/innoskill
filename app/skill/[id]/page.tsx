"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { CopyButton } from "@/components/copy-button";
import { Markdown } from "@/components/markdown";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Badges } from "@/components/skill-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rawFileUrl, recordSkillView, useMeta, useSkill } from "@/lib/api";
import { colorOf, skillSourceUrl } from "@/lib/types";

const fmt = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export default function SkillPage() {
	const { id } = useParams<{ id: string }>();
	const { data: s, error, isLoading } = useSkill(id);
	useEffect(() => { if (id) recordSkillView(id); }, [id]);
	const { data: meta } = useMeta();
	const sc = meta?.scenarios.find((x) => x.key === s?.scenario);
	const color = colorOf(s?.category ?? "");
	const origin = typeof window !== "undefined" ? window.location.origin : "";
	const hubConfig = JSON.stringify({ contentHub: { type: "bundle", baseUrl: origin || "http://<innoskill>" } }, null, 2);

	return (
		<>
			<SiteHeader />
			<main className="mx-auto max-w-[1240px] px-6 pt-10 pb-20">
				<Link href="/skills" className="text-[13px] text-muted-foreground hover:text-foreground">← 全部技能</Link>
				{error && <div className="py-20 text-center text-muted-foreground">找不到这个技能:{id}<div className="mt-4"><Link className="text-primary underline" href="/skills">回全部技能</Link></div></div>}
				{isLoading && !s && <div className="mt-6 space-y-4"><Skeleton className="h-6 w-24" /><Skeleton className="h-14 w-2/3" /><Skeleton className="h-6 w-1/2" /><Skeleton className="mt-8 h-96 w-full" /></div>}
				{s && (
					<>
						<header className="mt-5 grid gap-8 lg:grid-cols-[1fr_360px]">
							<div>
								<div className="flex flex-wrap items-center gap-2">
									{sc && <span className="rounded-full px-[9px] py-[3px] text-[10.5px] font-extrabold tracking-[.1em]" style={{ background: sc.color.bg, color: sc.color.ink }}>{s.scenario}</span>}
									<span className="rounded-full px-[9px] py-[3px] text-[10.5px] font-extrabold tracking-[.1em]" style={{ background: color.bg, color: color.fg }}>{s.category}</span>
									<Badges s={s} />
								</div>
								<h1 className="serif ink-2 mt-4 text-[clamp(36px,5.5vw,64px)] leading-[1.05] font-normal tracking-normal break-words">{s.name}</h1>
								<p className="mt-4 max-w-[62ch] text-[16px] leading-[1.65] text-[#4b483f]">{s.tagline}</p>
								{s.description && s.description !== s.tagline && <p className="mt-3 max-w-[70ch] text-[13.5px] leading-[1.7] text-muted-foreground">{s.description}</p>}
								<div className="mt-4 text-[13.5px] tracking-[.08em] text-muted-foreground uppercase">
									{s.group && <span>{s.group} · </span>}
									{s.refUrl ? <>来源 <a className="text-primary underline" href={s.refUrl} target="_blank" rel="noopener">{s.refText}</a></> : <span>inno-agent-hub {s.type}</span>}
									{" · "}Inno / Skill {s.num}
									{s.installCount > 0 && <span> · {s.installCount} 人在用</span>}
								</div>
								{s.packs.length > 0 && (
									<div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
										属于技能包:
										{s.packs.map((p) => <Link key={p.id} href={`/skills?pack=${encodeURIComponent(p.id)}`} className="rounded-full border border-border bg-card px-2.5 py-0.5 text-foreground hover:border-primary hover:text-primary">{p.name}</Link>)}
									</div>
								)}
							</div>
							{s.hasDemo && (
								<div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_20px_44px_-20px_rgba(20,20,15,.3)]">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img src={s.demo} alt={`${s.name} 演示`} className="block w-full" loading="lazy" />
								</div>
							)}
						</header>

						<div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
							<section className="min-w-0">
								<Tabs defaultValue="doc">
									<TabsList>
										<TabsTrigger value="doc">SKILL.md</TabsTrigger>
										<TabsTrigger value="files">文件({s.files.length})</TabsTrigger>
										<TabsTrigger value="meta">元信息</TabsTrigger>
									</TabsList>
									<TabsContent value="doc" className="mt-4 rounded-xl border border-border bg-card p-6 sm:p-8">
										<Markdown source={s.body} resolveUrl={(rel) => rawFileUrl("skills", s.id, rel)} />
									</TabsContent>
									<TabsContent value="files" className="mt-4 rounded-xl border border-border bg-card">
										<ul className="divide-y divide-border text-[13px]">
											{s.files.map((f) => (
												<li key={f.path} className="flex items-center justify-between gap-4 px-5 py-2.5">
													<a className="truncate text-[14px] hover:text-primary hover:underline" href={rawFileUrl("skills", s.id, f.path)} target="_blank" rel="noopener">{f.path}</a>
													<span className="shrink-0 text-muted-foreground">{fmt(f.size)}</span>
												</li>
											))}
										</ul>
									</TabsContent>
									<TabsContent value="meta" className="mt-4 rounded-xl border border-border bg-card p-5">
										<dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[13px]">
											{Object.entries(s.frontmatter).map(([k, v]) => <Row key={k} k={k} v={v} />)}
											<Row k="id" v={s.id} /><Row k="内容哈希" v={s.contentHash} /><Row k="同步于" v={new Date(s.syncedAt).toLocaleString("zh-CN")} />
										</dl>
									</TabsContent>
								</Tabs>
							</section>

							<aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
								<div className="overflow-hidden rounded-[9px] border border-border bg-[#f4f2ec]">
									<div className="flex items-center justify-between gap-2.5 border-b border-border bg-[#efece4] px-3 py-2">
										<span className="text-[10.5px] font-extrabold tracking-[.09em] text-muted-foreground">试试这句话</span>
										<CopyButton text={s.example} />
									</div>
									<div className="p-[13px] text-[13.5px] leading-[1.68] text-[#26241d] break-words">{s.example}</div>
								</div>

								<div className="rounded-xl border border-border bg-card p-5">
									<div className="text-[10.5px] font-extrabold tracking-[.09em] text-muted-foreground">在 InnoAgent 中使用</div>
									<ol className="mt-3 list-decimal space-y-2 pl-5 text-[13.5px] leading-[1.6]">
										<li>打开 Inno Agent → <b>技能</b> → <b>技能库</b></li>
										<li>找到 <code className="rounded bg-[#eeebe3] px-1.5 py-0.5 font-mono text-[12px]">{s.id}</code>,点<b>导入</b></li>
										<li>对话里直接说上面那句话</li>
									</ol>
									<details className="mt-4 text-[12.5px]">
										<summary className="cursor-pointer text-muted-foreground hover:text-foreground">技能库还没指向 Innoskill?</summary>
										<p className="mt-2 text-muted-foreground">把 inno-agent 的 <code className="font-mono">config.json</code> 里的 contentHub 改成:</p>
										<pre className="mt-2 overflow-x-auto rounded-lg bg-foreground p-3 text-[11.5px] leading-relaxed text-[#ece9df]">{hubConfig}</pre>
										<div className="mt-2 flex justify-end"><CopyButton text={hubConfig} label="复制配置" /></div>
									</details>
									<a href={s.bundleUrl} className="mt-4 flex items-center justify-between rounded-full bg-primary px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#175a3b]">
										下载技能包 .tar.gz <span>↓</span>
									</a>
								</div>

								<div className="rounded-xl border border-border bg-card p-5 text-[13px]">
									<div className="text-[10.5px] font-extrabold tracking-[.09em] text-muted-foreground">来源</div>
									<ul className="mt-3 space-y-2">
										{meta && <li><a className="text-primary hover:underline" href={skillSourceUrl(meta.repo, s.id)} target="_blank" rel="noopener">在 inno-agent-hub 查看源码 ↗</a></li>}
										{s.refUrl && <li><a className="text-primary hover:underline" href={s.refUrl} target="_blank" rel="noopener">原始出处:{s.refText} ↗</a></li>}
									</ul>
									{(sc || s.also.length > 0) && (
										<div className="mt-4 text-muted-foreground">
											适用场景:{[sc?.title, ...s.also.map((k) => meta?.scenarios.find((x) => x.key === k)?.title)].filter(Boolean).join(" · ")}
										</div>
									)}
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

function Row({ k, v }: { k: string; v: string }) {
	return (<><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></>);
}
