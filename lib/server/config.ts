import { resolve } from "node:path";

const env = (k: string, d = ""): string => (process.env[k] ?? d).trim();
const num = (k: string, d: number): number => {
	const v = Number(env(k));
	return Number.isFinite(v) && env(k) !== "" ? v : d;
};

const port = num("PORT", 8080);

export const config = {
	port,
	dataDir: resolve(env("DATA_DIR", "./runtime")),
	publicUrl: env("PUBLIC_URL", `http://localhost:${port}`).replace(/\/+$/, ""),
	source: {
		/** 设了就直接读这个目录,不做 git 操作(本地开发用) */
		localDir: env("SOURCE_LOCAL_DIR") ? resolve(env("SOURCE_LOCAL_DIR")) : "",
		repoUrl: env("SOURCE_REPO_URL", "https://github.com/Chloris-Blaxk/inno-agent-hub.git"),
		ref: env("SOURCE_REF", "main"),
		skillsPath: env("SKILLS_PATH", "skill-library"),
		presetsPath: env("PRESETS_PATH", "workspace-templates"),
	},
	syncIntervalMin: num("SYNC_INTERVAL_MIN", 10),
	syncSecret: env("SYNC_SECRET"),
	hubToken: env("HUB_TOKEN"),
	/** InnoAgent 后端调用户相关接口用的服务密钥(X-Innoskill-Key);不设则那组接口关闭 */
	serviceKey: env("SERVICE_KEY"),
} as const;

export type Config = typeof config;
