import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "../config";

export interface SourceCheckout {
	dir: string;
	sha: string;
	ref: string;
}

function git(args: string[], cwd?: string): string {
	const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
	if (r.status !== 0) {
		throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || r.stdout || "").trim()}`);
	}
	return r.stdout.trim();
}

/**
 * 把内容源仓库拿到本地。
 * - SOURCE_LOCAL_DIR 设了:直接用那个目录,不碰 git(本地开发)
 * - 否则:浅 clone 到 <dataDir>/source,之后每次 fetch + reset 到远端 ref
 */
export function ensureSource(): SourceCheckout {
	const { localDir, repoUrl, ref } = config.source;
	if (localDir) {
		if (!existsSync(localDir)) throw new Error(`SOURCE_LOCAL_DIR 不存在: ${localDir}`);
		let sha = "local";
		try { sha = git(["rev-parse", "--short", "HEAD"], localDir); } catch { /* 不是 git 仓库也行 */ }
		return { dir: localDir, sha, ref: "local" };
	}
	const dir = join(config.dataDir, "source");
	if (!existsSync(join(dir, ".git"))) {
		mkdirSync(config.dataDir, { recursive: true });
		git(["clone", "--quiet", "--depth", "1", "--branch", ref, repoUrl, dir]);
	} else {
		git(["fetch", "--quiet", "--depth", "1", "origin", ref], dir);
		git(["reset", "--quiet", "--hard", "FETCH_HEAD"], dir);
	}
	return { dir, sha: git(["rev-parse", "--short", "HEAD"], dir), ref };
}
