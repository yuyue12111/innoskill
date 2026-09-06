import Link from "next/link";

export default function NotFound() {
	return (
		<main className="grid min-h-screen place-items-center p-6 text-center">
			<div>
				<div className="mx-auto mb-7 grid w-[96px] grid-cols-3 gap-1.5" aria-hidden>
					{["#1f6f4a", "#e8b06b", "#1f6f4a", "#14140f", "", "#c96a5a", "#1f6f4a", "#7a93b8", ""].map((c, i) => (
						<i key={i} className="block h-7" style={c ? { background: c } : { border: "1px dashed var(--border)" }} />
					))}
				</div>
				<h1 className="text-[clamp(28px,6vw,44px)] leading-[1.1] font-bold tracking-tight">这块图还没画出来</h1>
				<p className="mt-3 leading-relaxed text-muted-foreground">你要找的页面不存在,或者技能已经改名了。</p>
				<div className="mt-6 flex justify-center gap-2">
					<Link href="/" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white">回到星图</Link>
					<Link href="/skills" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">全部技能</Link>
				</div>
			</div>
		</main>
	);
}
