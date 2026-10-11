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
      throw badRequest("SKILL.md 的 frontmatter 不是合法的 YAML");
    }
  }
  const fm = isRecord(raw) ? raw : {};
  const name = asString(fm.name);
  const description = asString(fm.description);
  if (!name) throw badRequest("SKILL.md 缺少 name");
  if (!description) throw badRequest("SKILL.md 缺少 description");
  // 列长见 04 §4.1,超长直接拒,不截断
  if (name.length > 256) throw badRequest("name 不能超过 256 个字符");
  if (description.length > 512) throw badRequest("description 不能超过 512 个字符");
  return { name, description, version: asString(fm.version) || null, raw: fm };
}

const RESERVED_SLUGS = new Set(["admin", "api", "me", "global", "system"]);

/** slug = slugify(name):转小写 → 非字母数字转 `-` → 折叠 → 去首尾 `-`(03 §3.2) */
export function slugFromName(name: string): string {
  // SKILL.md 要求纯英文;中文展示信息另存数据库
  if (/[^\x20-\x7E]/.test(name)) throw badRequest(`name 必须是英文：${name}`);
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length < 2 || slug.length > 64 || RESERVED_SLUGS.has(slug)) {
    throw badRequest(`name 无法生成合法的 slug：${name}（需 2–64 位英文字母或数字，且不能是保留字）`);
  }
  return slug;
}

const VERSION = /^[A-Za-z0-9._-]{1,64}$/;

/** frontmatter 没写版本号时生成 yyyyMMdd.HHmmss(UTC) */
export function resolveVersion(declared: string | null, now: Date): string {
  const version = declared ?? timestampVersion(now);
  if (!VERSION.test(version)) throw badRequest(`版本号格式不正确：${version}（1–64 位，只能含字母、数字和 . _ -）`);
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
