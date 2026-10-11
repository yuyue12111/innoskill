import { badRequest } from "./errors.js";

/** 标签词表(03 §1.7):前 5 个是场景,后 5 个是学段;分组只用于前端展示 */
export const TAGS = [
  "teaching",
  "learning",
  "management",
  "assessment",
  "research",
  "preschool",
  "primary",
  "junior",
  "senior",
  "university",
] as const;

const ALLOWED = new Set<string>(TAGS);

/** 解析逗号分隔的标签,去重;词表外的值 → 400 */
export function parseTags(input: string | undefined): string[] {
  const tags = [
    ...new Set(
      (input ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
  const unknown = tags.filter((t) => !ALLOWED.has(t));
  if (unknown.length > 0) throw badRequest(`unknown tags: ${unknown.join(", ")}`);
  return tags;
}
