import { config } from "./config";
import { getDb, kvGet } from "./db";
import { runSync } from "./sync/run";

const g = globalThis as unknown as { __innoskillScheduler?: boolean };

/** instrumentation.register() 里调用:建库、跑一次启动同步、挂定时器。进程内只执行一次。 */
export async function startScheduler(): Promise<void> {
	if (g.__innoskillScheduler) return;
	g.__innoskillScheduler = true;
	getDb();
	const first = await runSync("startup");
	if (!first.ok && !kvGet("last_sync")) {
		console.error("[innoskill] 首次同步失败且没有旧索引,服务照常启动但目录为空:", first.message);
	}
	if (config.syncIntervalMin > 0) {
		setInterval(() => { void runSync("interval"); }, config.syncIntervalMin * 60_000).unref();
	}
	console.log(`[innoskill] inno-agent contentHub → { "type": "bundle", "baseUrl": "${config.publicUrl}" }`);
}
