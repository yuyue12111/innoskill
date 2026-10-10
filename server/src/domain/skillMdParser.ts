import { parse } from "yaml";
import { badRequest } from "./errors.js";

export interface SkillMeta {
  name: string;
  description: string;
  version: string | null;
  /** frontmatter 原样,存 skill_version.parsed_metadata_json */
  raw: Record<string, unknown>;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** 解析 SKILL.md 的 YAML frontmatter(03 §3.2) */
export function parseSkillMd(text: string): SkillMeta {
  const match = FRONTMATTER.exec(text.replace(/^\uFEFF/, ""));
  let raw: unknown = null;
  if (match) {
    try {
      // failsafe:标量一律按字符串读,version: 1.0 不会变成数字 1
      raw = parse(match[1] ?? "", { schema: "failsafe" });
    } catch {
      throw badRequest("SKILL.md frontmatter is not valid YAML");
    }
  }
  const fm = isRecord(raw) ? raw : {};
  const name = asString(fm.name);
  const description = asString(fm.description);
  if (!name) throw badRequest("SKILL.md frontmatter missing name");
  if (!description) throw badRequest("SKILL.md frontmatter missing description");
  // 列长见 04 §4.1,超长直接拒,不截断
  if (name.length > 256) throw badRequest("name exceeds 256 characters");
  if (description.length > 512) throw badRequest("description exceeds 512 characters");
  return { name, description, version: asString(fm.version) || null, raw: fm };
}

const RESERVED_SLUGS = new Set(["admin", "api", "me", "global", "system"]);

/** slug = slugify(name):转小写 → 非字母数字转 `-` → 折叠 → 去首尾 `-`(03 §3.2) */
export function slugFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length < 2 || slug.length > 64 || RESERVED_SLUGS.has(slug)) {
    throw badRequest(`cannot derive a valid slug from name: ${name}`);
  }
  return slug;
}

const VERSION = /^[A-Za-z0-9._-]{1,64}$/;

/** frontmatter 没写版本号时生成 yyyyMMdd.HHmmss(UTC) */
export function resolveVersion(declared: string | null, now: Date): string {
  const version = declared ?? timestampVersion(now);
  if (!VERSION.test(version)) throw badRequest(`invalid version: ${version}`);
  return version;
}

function timestampVersion(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `.${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
  );
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
