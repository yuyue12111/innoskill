/** Next 服务启动时执行一次:同步内容源 + 挂定时同步。只在 Node runtime 跑。 */
export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { startScheduler } = await import("./lib/server/scheduler");
		await startScheduler();
	}
}
