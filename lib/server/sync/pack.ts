import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import * as tar from "tar";
import { config } from "../config";

export type Category = "skills" | "presets";

export function bundlePath(category: Category, id: string): string {
	return join(config.dataDir, "bundles", category, `${id}.tar.gz`);
}

/**
 * 把一个技能 / 预设目录打成 tar.gz,顶层目录名 = id
 * (inno-agent 解压时 --strip-components=1,所以必须有这一层)。
 * 先写临时文件再 rename,避免下载到半个包。
 */
export async function packItem(category: Category, id: string, itemDir: string): Promise<string> {
	const out = bundlePath(category, id);
	mkdirSync(dirname(out), { recursive: true });
	const tmp = `${out}.tmp-${process.pid}`;
	try {
		await tar.create(
			{ gzip: true, file: tmp, cwd: dirname(itemDir), portable: true, filter: (p) => !p.endsWith("/.DS_Store") },
			[id],
		);
		renameSync(tmp, out);
	} finally {
		if (existsSync(tmp)) rmSync(tmp, { force: true });
	}
	return out;
}

export function removeBundle(category: Category, id: string): void {
	rmSync(bundlePath(category, id), { force: true });
}
