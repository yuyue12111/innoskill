// 测试用的内存实现,都满足 ports 里的 interface。
import { strToU8, zipSync } from "fflate";
import { pino } from "pino";
import { createApp } from "../src/app.js";
import type { Skill, SkillFile, SkillVersion } from "../src/domain/model.js";
import type { Counter } from "../src/middleware/rateLimit.js";
import type { Clock } from "../src/ports/clock.js";
import type { ObjectStorage } from "../src/ports/objectStorage.js";
import type { Database, Repositories } from "../src/ports/repositories.js";
import type { SearchIndex } from "../src/ports/searchIndex.js";

interface State {
  seq: number;
  skills: Map<number, Skill>;
  versions: Map<number, SkillVersion>;
  files: Map<number, SkillFile>;
  stats: Map<number, { skillId: number; downloadCount: number }>;
}

const emptyState = (): State => ({
  seq: 0,
  skills: new Map(),
  versions: new Map(),
  files: new Map(),
  stats: new Map(),
});

export type MemoryDb = Database & { readonly state: State };

/** 事务用快照实现回滚,模拟数据库的「抛错即回滚」 */
export function createMemoryDb(): MemoryDb {
  let state = emptyState();
  const repos = createMemoryRepositories(() => state);
  return {
    ...repos,
    get state() {
      return state;
    },
    async transaction(fn) {
      const snapshot = structuredClone(state);
      try {
        return await fn(repos);
      } catch (err) {
        state = snapshot;
        throw err;
      }
    },
  };
}

function createMemoryRepositories(s: () => State): Repositories {
  const nextId = () => ++s().seq;
  const byPublishedDesc = (a: SkillVersion, b: SkillVersion) =>
    (b.publishedAt?.getTime() ?? -Infinity) - (a.publishedAt?.getTime() ?? -Infinity) || b.id - a.id;

  return {
    skills: {
      findByUserAndSlug: async (userId, slug) =>
        [...s().skills.values()].find((k) => k.userId === userId && k.slug === slug) ?? null,
      findByIds: async (ids) => ids.flatMap((id) => s().skills.get(id) ?? []),
      create: async (input) => {
        if ([...s().skills.values()].some((k) => k.userId === input.userId && k.slug === input.slug)) {
          throw new Error("unique violation: skill(user_id, slug)");
        }
        const skill: Skill = { ...input, id: nextId(), status: "ACTIVE", latestVersionId: null, downloadCount: 0, hidden: false };
        s().skills.set(skill.id, skill);
        return skill;
      },
      update: async (id, patch) => {
        const skill = { ...s().skills.get(id)!, ...patch };
        s().skills.set(id, skill);
        return skill;
      },
      incrementDownloadCount: async (id) => {
        const skill = s().skills.get(id)!;
        s().skills.set(id, { ...skill, downloadCount: skill.downloadCount + 1 });
      },
    },
    versions: {
      findBySkillAndVersion: async (skillId, version) =>
        [...s().versions.values()].find((v) => v.skillId === skillId && v.version === version) ?? null,
      findByIds: async (ids) => ids.flatMap((id) => s().versions.get(id) ?? []),
      listBySkill: async (skillId) =>
        [...s().versions.values()].filter((v) => v.skillId === skillId).sort(byPublishedDesc),
      findLatestDownloadable: async (skillId) =>
        [...s().versions.values()]
          .filter((v) => v.skillId === skillId && v.status === "PUBLISHED" && v.downloadReady && !v.yankedAt)
          .sort(byPublishedDesc)[0] ?? null,
      create: async (input) => {
        const version: SkillVersion = { ...input, id: nextId() };
        s().versions.set(version.id, version);
        return version;
      },
      update: async (id, patch) => {
        const version = { ...s().versions.get(id)!, ...patch };
        s().versions.set(id, version);
        return version;
      },
    },
    files: {
      listByVersion: async (versionId) => [...s().files.values()].filter((f) => f.versionId === versionId),
      createMany: async (files) => {
        for (const f of files) {
          const id = nextId();
          s().files.set(id, { ...f, id });
        }
      },
      deleteByVersion: async (versionId) => {
        for (const [id, f] of s().files) if (f.versionId === versionId) s().files.delete(id);
      },
    },
    stats: {
      increment: async (skillId, versionId) => {
        const row = s().stats.get(versionId) ?? { skillId, downloadCount: 0 };
        s().stats.set(versionId, { ...row, downloadCount: row.downloadCount + 1 });
      },
    },
  };
}

export type MemoryStorage = ObjectStorage & { objects: Map<string, Uint8Array> };

export function createMemoryStorage(): MemoryStorage {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    put: async (key, bytes) => void objects.set(key, bytes),
    exists: async (key) => objects.has(key),
    getBytes: async (key) => objects.get(key) ?? null,
    getStream: async (key) => {
      const bytes = objects.get(key);
      return bytes ? { body: new Blob([new Uint8Array(bytes)]).stream(), size: bytes.length } : null;
    },
    deleteMany: async (keys) => keys.forEach((k) => objects.delete(k)),
    presignGet: async (key, expires) => `https://storage.test/${key}?expires=${expires}`,
  };
}

/** 简化版索引:只模拟可见性、作者、关键词子串过滤和分页 */
export function createMemorySearchIndex(db: MemoryDb): SearchIndex {
  const indexed = new Set<number>();
  return {
    upsert: async (id) => void indexed.add(id),
    search: async (q) => {
      const hits = [...db.state.skills.values()]
        .filter(
          (s) =>
            indexed.has(s.id) &&
            !s.hidden &&
            (s.visibility === "PUBLIC" || s.userId === q.viewerId) &&
            (q.authorId === null || s.userId === q.authorId) &&
            q.tags.every((t) => s.tags.includes(t)) &&
            (!q.q || `${s.skillName} ${s.summary}`.includes(q.q)),
        )
        .sort((a, b) => (q.sort === "downloads" ? b.downloadCount - a.downloadCount : 0) || b.id - a.id);
      return { ids: hits.slice(q.page * q.size, (q.page + 1) * q.size).map((s) => s.id), total: hits.length };
    },
  };
}

export function createMemoryCounter(): Counter {
  const counts = new Map<string, number>();
  return {
    incr: async (key) => {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return n;
    },
    expire: async () => 1,
  };
}

export function createTestClock(start = "2026-10-10T09:30:05Z"): Clock & { advance(ms: number): void } {
  let now = new Date(start);
  return {
    now: () => new Date(now),
    advance: (ms) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

// ---- 构造技能包 ----

export function makeZip(files: Record<string, string | Uint8Array>): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, typeof v === "string" ? strToU8(v) : v])));
}

export function skillMd(frontmatter: Record<string, string>, body = "# Skill\n"): string {
  const lines = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

export const weatherPackage = (version = "1.0.0", extra: Record<string, string | Uint8Array> = {}) =>
  makeZip({
    "SKILL.md": skillMd({ name: "Weather", description: "查天气", version }),
    "main.py": "print('sunny')\n",
    ...extra,
  });

// ---- 组装 app ----

export function setup() {
  const db = createMemoryDb();
  const storage = createMemoryStorage();
  const searchIndex = createMemorySearchIndex(db);
  const clock = createTestClock();
  const app = createApp({ db, storage, searchIndex, clock, logger: pino({ level: "silent" }) }, createMemoryCounter());

  const headers = (user?: string, extra: Record<string, string> = {}) =>
    user ? { "X-User-Id": user, ...extra } : extra;

  return {
    app,
    db,
    storage,
    clock,
    upload: (
      zip: Uint8Array,
      opts: { user?: string; visibility?: string; tags?: string; confirmWarnings?: string } = { user: "alice" },
    ) => {
      const form = new FormData();
      form.set("file", new File([new Uint8Array(zip)], "skill.zip", { type: "application/zip" }));
      if (opts.visibility) form.set("visibility", opts.visibility);
      if (opts.tags !== undefined) form.set("tags", opts.tags);
      if (opts.confirmWarnings) form.set("confirmWarnings", opts.confirmWarnings);
      return app.request("/api/skills", { method: "POST", body: form, headers: headers(opts.user) });
    },
    get: (path: string, user?: string, extra?: Record<string, string>) =>
      app.request(path, { headers: headers(user, extra) }),
    del: (path: string, user?: string) => app.request(path, { method: "DELETE", headers: headers(user) }),
  };
}
