export default function Home() {
	return (
		<main className="mx-auto max-w-2xl p-10 space-y-3">
			<h1 className="text-2xl font-semibold">Innoskill</h1>
			<p className="text-muted-foreground">前端正在施工。后端接口已就位:</p>
			<ul className="list-disc pl-5 text-sm">
				<li><a className="underline" href="/index.json">/index.json</a>(inno-agent bundle 协议)</li>
				<li><a className="underline" href="/api/v1/skills">/api/v1/skills</a></li>
				<li><a className="underline" href="/api/v1/meta">/api/v1/meta</a></li>
			</ul>
		</main>
	);
}
