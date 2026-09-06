import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import { config } from "./config";

// node:sqlite 是较新的内置模块,Turbopack 不认识这个 specifier(连 createRequire 都会被它接管);
// process.getBuiltinModule 是 Node 22.3+ 专门给这种场景的 API,bundler 完全不介入。
const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");

/**
 * 数据模型见 docs/01-需求定义.md 第 6 节。
 * 第一期真正用到:skill / skill_fts / preset / sync_run / kv。
 * pack / pack_skill / user_install / skill_stat 是第二期预留,建表不写入。
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS skill (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT '',
  tagline       TEXT NOT NULL DEFAULT '',
  grp           TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT '收集',
  verified      INTEGER NOT NULL DEFAULT 0,
  ref_text      TEXT NOT NULL DEFAULT '',
  ref_url       TEXT NOT NULL DEFAULT '',
  demo_path     TEXT NOT NULL DEFAULT '',
  scenario      TEXT NOT NULL DEFAULT '',
  also_json     TEXT NOT NULL DEFAULT '[]',
  example       TEXT NOT NULL DEFAULT '',
  frontmatter_json TEXT NOT NULL DEFAULT '{}',
  files_json    TEXT NOT NULL DEFAULT '[]',
  body          TEXT NOT NULL DEFAULT '',
  content_hash  TEXT NOT NULL,
  synced_at     TEXT NOT NULL
);
CREATE VIRTUAL TABLE IF NOT EXISTS skill_fts USING fts5(
  id UNINDEXED, name, description, tagline, body, tokenize='trigram'
);
CREATE TABLE IF NOT EXISTS preset (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  icon          TEXT NOT NULL DEFAULT '',
  meta_json     TEXT NOT NULL DEFAULT '{}',
  files_json    TEXT NOT NULL DEFAULT '[]',
  content_hash  TEXT NOT NULL,
  synced_at     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_run (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at    TEXT NOT NULL,
  finished_at   TEXT,
  reason        TEXT NOT NULL DEFAULT '',
  source_ref    TEXT NOT NULL DEFAULT '',
  commit_sha    TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'running',
  message       TEXT NOT NULL DEFAULT '',
  skills        INTEGER NOT NULL DEFAULT 0,
  presets       INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);

-- 第二期预留
CREATE TABLE IF NOT EXISTS pack (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '', curated_by TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pack_skill (
  pack_id TEXT NOT NULL, skill_id TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pack_id, skill_id)
);
CREATE TABLE IF NOT EXISTS user_install (
  user_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  installed_at TEXT NOT NULL, uninstalled_at TEXT,
  PRIMARY KEY (user_id, skill_id)
);
CREATE TABLE IF NOT EXISTS skill_stat (
  skill_id TEXT PRIMARY KEY, install_count INTEGER NOT NULL DEFAULT 0, view_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_user_install_skill ON user_install (skill_id, uninstalled_at);
CREATE INDEX IF NOT EXISTS idx_pack_skill_skill ON pack_skill (skill_id);
`;

// 挂在 globalThis 上:Next dev 热更新会重新执行模块,但进程只该开一个库
const g = globalThis as unknown as { __innoskillDb?: DatabaseSyncType };

export function getDb(): DatabaseSyncType {
	if (g.__innoskillDb) return g.__innoskillDb;
	mkdirSync(config.dataDir, { recursive: true });
	const db = new DatabaseSync(join(config.dataDir, "innoskill.db"));
	db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
	db.exec(SCHEMA);
	g.__innoskillDb = db;
	return db;
}

export function kvGet(k: string): string | null {
	const row = getDb().prepare("SELECT v FROM kv WHERE k = ?").get(k) as { v: string } | undefined;
	return row?.v ?? null;
}

export function kvSet(k: string, v: string): void {
	getDb().prepare("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(k, v);
}
