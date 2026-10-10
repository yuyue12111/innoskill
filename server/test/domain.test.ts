import { strFromU8, strToU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { canView, checkDownload, searchScope } from "../src/domain/accessControl.js";
import type { AppError } from "../src/domain/errors.js";
import type { Requester, Skill, SkillVersion } from "../src/domain/model.js";
import { buildBundle, parsePackage } from "../src/domain/packageParser.js";
import { parseSkillMd, resolveVersion, slugFromName } from "../src/domain/skillMdParser.js";
import { makeZip, skillMd } from "./fakes.js";

const SKILL_MD = skillMd({ name: "Weather", description: "查天气" });

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (err) {
    return (err as AppError).code;
  }
  return undefined;
}

describe("parsePackage", () => {
  it("剥掉单层根目录,跳过 __MACOSX / .DS_Store / ._*", () => {
    const pkg = parsePackage(
      makeZip({
        "weather/SKILL.md": SKILL_MD,
        "weather/src/main.py": "print(1)\n",
        "weather/.DS_Store": "x",
        "weather/._main.py": "x",
        "__MACOSX/weather/._SKILL.md": "x",
      }),
    );
    expect(pkg.files.map((f) => f.path).sort()).toEqual(["SKILL.md", "src/main.py"]);
    expect(pkg.warnings).toEqual([]);
  });

  it.each([
    ["不是 zip", strToU8("not a zip")],
    ["缺 SKILL.md", makeZip({ "README.md": "hi" })],
    ["路径逃逸", makeZip({ "SKILL.md": SKILL_MD, "../evil.sh": "rm -rf /" })],
    ["文件数 > 100", makeZip(Object.fromEntries([["SKILL.md", SKILL_MD], ...Array.from({ length: 100 }, (_, i) => [`f${i}.md`, "x"])]))],
    ["单文件 > 10 MB", makeZip({ "SKILL.md": SKILL_MD, "big.txt": new Uint8Array(10 * 1024 * 1024 + 1) })],
  ])("%s → 400", (_, zip) => {
    expect(codeOf(() => parsePackage(zip))).toBe("BAD_REQUEST");
  });

  it("扩展名不在白名单 / 内容与扩展名不符 / 疑似密钥 → 只产生 warning", () => {
    const pkg = parsePackage(
      makeZip({
        "SKILL.md": SKILL_MD,
        "tool.exe": "MZ",
        "logo.png": "not a png",
        "config.py": "KEY = 'AKIAABCDEFGHIJKLMNOP'\n",
      }),
    );
    expect(pkg.warnings.map((w) => [w.filePath, w.code]).sort()).toEqual([
      ["config.py", "POSSIBLE_SECRET"],
      ["logo.png", "CONTENT_MISMATCH"],
      ["tool.exe", "EXTENSION_NOT_ALLOWED"],
    ]);
  });

  it("buildBundle 重新打出的包内容一致", () => {
    const pkg = parsePackage(makeZip({ "SKILL.md": SKILL_MD, "a/b.txt": "hello" }));
    const files = unzipSync(buildBundle(pkg.files));
    expect(strFromU8(files["a/b.txt"]!)).toBe("hello");
  });
});

describe("parseSkillMd", () => {
  it("读 name / description / version,version 保持字符串", () => {
    const meta = parseSkillMd(skillMd({ name: "Weather", description: "查天气", version: "1.0" }));
    expect(meta).toMatchObject({ name: "Weather", description: "查天气", version: "1.0" });
  });

  it.each([
    ["没有 frontmatter", "# just markdown"],
    ["缺 name", skillMd({ description: "d" })],
    ["缺 description", skillMd({ name: "n" })],
    ["description 超过 512", skillMd({ name: "n", description: "x".repeat(513) })],
  ])("%s → 400", (_, text) => {
    expect(codeOf(() => parseSkillMd(text))).toBe("BAD_REQUEST");
  });
});

describe("slugFromName", () => {
  it("转小写、非字母数字转 -、折叠、去首尾 -", () => {
    expect(slugFromName("  Weather  Forecast!! v2 ")).toBe("weather-forecast-v2");
  });

  it.each([["天气预报"], ["api"], ["A"], ["x".repeat(65)]])("%s → 400", (name) => {
    expect(codeOf(() => slugFromName(name))).toBe("BAD_REQUEST");
  });
});

describe("resolveVersion", () => {
  it("省略时生成 yyyyMMdd.HHmmss(UTC)", () => {
    expect(resolveVersion(null, new Date("2026-10-10T09:30:05Z"))).toBe("20261010.093005");
  });

  it("只允许字母、数字和 . _ -", () => {
    expect(resolveVersion("1.2.0-beta_1", new Date())).toBe("1.2.0-beta_1");
    expect(codeOf(() => resolveVersion("1/2", new Date()))).toBe("BAD_REQUEST");
  });
});

// ---- 03 的判定表,原样当用例 ----

const skill = (over: Partial<Skill> = {}): Skill => ({
  id: 1,
  userId: "alice",
  slug: "weather",
  skillName: "Weather",
  summary: null,
  visibility: "PUBLIC",
  status: "ACTIVE",
  latestVersionId: 1,
  downloadCount: 0,
  hidden: false,
  ...over,
});

const version = (over: Partial<SkillVersion> = {}): SkillVersion => ({
  id: 1,
  skillId: 1,
  version: "1.0.0",
  status: "PUBLISHED",
  requestedVisibility: "PUBLIC",
  parsedMetadata: null,
  manifest: null,
  fileCount: 1,
  totalSize: 1,
  bundleReady: true,
  downloadReady: true,
  publishedAt: new Date(),
  yankedAt: null,
  ...over,
});

const ANON: Requester = null;
const OTHER: Requester = { userId: "bob" };
const OWNER: Requester = { userId: "alice" };

describe("下载门禁交叉表(03 §6.3)", () => {
  const columns = {
    "PUBLIC 已发布": [skill(), version()],
    "PRIVATE 已发布": [skill({ visibility: "PRIVATE" }), version()],
    技能已下架: [skill({ hidden: true }), version()],
    版本已下架: [skill(), version({ status: "YANKED", yankedAt: new Date() })],
  } as const;

  it.each([
    ["匿名", ANON, ["ALLOW", "FORBIDDEN", "FORBIDDEN", "NOT_DOWNLOADABLE"]],
    ["其他已登录用户", OTHER, ["ALLOW", "FORBIDDEN", "FORBIDDEN", "NOT_DOWNLOADABLE"]],
    ["技能作者", OWNER, ["ALLOW", "ALLOW", "ALLOW", "NOT_DOWNLOADABLE"]],
  ] as const)("%s", (_, requester, expected) => {
    const actual = Object.values(columns).map(([s, v]) => checkDownload(s, v, requester));
    expect(actual).toEqual(expected);
  });
});

describe("详情访问控制(03 §5.2)", () => {
  it.each([
    ["任何人 + PUBLIC 且未下架", skill(), OTHER, true],
    ["作者本人 + PRIVATE", skill({ visibility: "PRIVATE" }), OWNER, true],
    ["非作者 + PRIVATE", skill({ visibility: "PRIVATE" }), OTHER, false],
    ["非作者 + 已被技能级下架", skill({ hidden: true }), ANON, false],
    ["作者本人 + 已被技能级下架", skill({ hidden: true }), OWNER, true],
  ] as const)("%s", (_, s, requester, expected) => {
    expect(canView(s, requester)).toBe(expected);
  });
});

describe("搜索可见性(03 §4.2)", () => {
  it("匿名传 user_id=me → 401", () => {
    expect(codeOf(() => searchScope(ANON, "me"))).toBe("UNAUTHORIZED");
  });

  it("user_id=me 解析为当前用户", () => {
    expect(searchScope(OWNER, "me")).toEqual({ authorId: "alice", viewerId: "alice" });
  });

  it("已登录未带 user_id:PUBLIC + 自己的 PRIVATE", () => {
    expect(searchScope(OWNER, undefined)).toEqual({ authorId: null, viewerId: "alice" });
  });
});
