import { describe, expect, it } from "vitest";
import { isSafeItemName, parseReadme, splitFrontmatter } from "../lib/server/sync/parse";

describe("splitFrontmatter", () => {
	it("parses yaml frontmatter and body", () => {
		const { frontmatter, body } = splitFrontmatter(`---\nname: foo\ndescription: >-\n  多行\n  描述\ncategory: 教学辅导\n---\n# 正文\n`);
		expect(frontmatter.name).toBe("foo");
		expect(frontmatter.description).toBe("多行 描述");
		expect(frontmatter.category).toBe("教学辅导");
		expect(body.trim()).toBe("# 正文");
	});
	it("falls back to key:value when yaml is broken", () => {
		const { frontmatter } = splitFrontmatter(`---\nname: foo\ndescription: a: b: [c\n---\nx`);
		expect(frontmatter.name).toBe("foo");
		expect(frontmatter.description).toContain("a: b");
	});
	it("returns empty frontmatter when missing", () => {
		expect(splitFrontmatter("# no fm").frontmatter).toEqual({});
	});
});

describe("parseReadme", () => {
	it("reads grouped tables", () => {
		const md = `### 📚 教育 · 备课
| Skill | 类型 | 通过验证 | 一句话 | 引用 | 效果 |
|---|---|---|---|---|---|
| [k12](./k12/) | 收集 | ✅ | 备课 | [anthropics/k12](https://github.com/anthropics/k12) | [demo](./assets/k12/demo.gif) |
| [x](./x/) | 贡献 |  | 另一个 | | |
`;
		const rows = parseReadme(md);
		expect(rows["k12"]).toMatchObject({ group: "📚 教育 · 备课", type: "收集", verified: true, tagline: "备课", refUrl: "https://github.com/anthropics/k12", demo: "assets/k12/demo.gif" });
		expect(rows["x"]).toMatchObject({ type: "贡献", verified: false, refUrl: "", demo: "" });
	});
});

describe("isSafeItemName", () => {
	it("blocks traversal", () => {
		expect(isSafeItemName("ok-name")).toBe(true);
		expect(isSafeItemName("../x")).toBe(false);
		expect(isSafeItemName("a/b")).toBe(false);
		expect(isSafeItemName(".hidden")).toBe(false);
		expect(isSafeItemName("")).toBe(false);
	});
});
