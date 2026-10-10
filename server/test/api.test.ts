import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { bundleKey } from "../src/domain/model.js";
import { makeZip, setup, skillMd, weatherPackage } from "./fakes.js";

const DETAIL = "/api/skills/alice/weather";
const download = (v: string) => `/api/skills/alice/weather/versions/${v}/download`;

const json = async (res: Response) => (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("上传", () => {
  it("201,上传即发布", async () => {
    const t = setup();
    const res = await t.upload(weatherPackage("1.2.0"));
    expect(res.status).toBe(201);
    expect(await json(res)).toMatchObject({
      user_id: "alice",
      slug: "weather",
      skill_name: "Weather",
      summary: "查天气",
      visibility: "PUBLIC",
      version: "1.2.0",
      status: "PUBLISHED",
      fileCount: 2,
      publishedAt: "2026-10-10T09:30:05.000Z",
      warnings: [],
    });
    // N 个单文件 + 1 个整包
    expect([...t.storage.objects.keys()].sort()).toEqual([
      "packages/1/2/bundle.zip",
      "skills/1/2/SKILL.md",
      "skills/1/2/main.py",
    ]);
  });

  it("未登录 → 401", async () => {
    const res = await setup().upload(weatherPackage(), {});
    expect(res.status).toBe(401);
    expect(await json(res)).toEqual({ error: { code: "UNAUTHORIZED", message: "authentication required" } });
  });

  it("有 warning 且 confirmWarnings=false → 400,details 带 warnings;确认后放行", async () => {
    const t = setup();
    const zip = weatherPackage("1.0.0", { "tool.exe": "MZ" });
    const rejected = await t.upload(zip);
    expect(rejected.status).toBe(400);
    expect((await json(rejected)).error.details.warnings).toEqual([
      { code: "EXTENSION_NOT_ALLOWED", message: "extension .exe is not allowed", filePath: "tool.exe" },
    ]);

    const accepted = await t.upload(zip, { user: "alice", confirmWarnings: "true" });
    expect(accepted.status).toBe(201);
    expect((await json(accepted)).warnings).toHaveLength(1);
  });

  it("版本号已存在且已发布 → 400;下架后同版本号可覆盖", async () => {
    const t = setup();
    await t.upload(weatherPackage("1.0.0"));
    expect((await t.upload(weatherPackage("1.0.0"))).status).toBe(400);

    await t.del(`${DETAIL}/versions/1.0.0`, "alice");
    const res = await t.upload(weatherPackage("1.0.0", { "extra.md": "v2" }));
    expect(res.status).toBe(201);
    const detail = await json(await t.get(DETAIL));
    expect(detail.versions).toEqual([expect.objectContaining({ version: "1.0.0", status: "PUBLISHED", yankedAt: null, fileCount: 3 })]);
  });

  it("写对象存储失败 → 500,数据库回滚", async () => {
    const t = setup();
    t.storage.put = async () => {
      throw new Error("storage down");
    };
    expect((await t.upload(weatherPackage())).status).toBe(500);
    expect(t.db.state.skills.size).toBe(0);
    expect(t.db.state.versions.size).toBe(0);
  });

  it("请求体 > 10 MB → 400", async () => {
    const t = setup();
    const res = await t.upload(new Uint8Array(10 * 1024 * 1024 + 1));
    expect(res.status).toBe(400);
  });

  it("visibility 非法 → 400", async () => {
    const res = await setup().upload(weatherPackage(), { user: "alice", visibility: "SECRET" });
    expect(res.status).toBe(400);
  });
});

describe("详情", () => {
  it("带 versions[],标出 headline", async () => {
    const t = setup();
    await t.upload(weatherPackage("1.0.0"));
    t.clock.advance(1000);
    await t.upload(weatherPackage("1.1.0"));
    const body = await json(await t.get(DETAIL));
    expect(body).toMatchObject({ headlineVersion: "1.1.0", hidden: false, user_name: "alice", downloadCount: 0 });
    expect(body.versions.map((v: { version: string; isHeadline: boolean }) => [v.version, v.isHeadline])).toEqual([
      ["1.1.0", true],
      ["1.0.0", false],
    ]);
  });

  it("PRIVATE:作者 200,其他人 403;不存在 → 400 NOT_FOUND", async () => {
    const t = setup();
    await t.upload(weatherPackage(), { user: "alice", visibility: "PRIVATE" });
    expect((await t.get(DETAIL, "alice")).status).toBe(200);
    expect((await t.get(DETAIL, "bob")).status).toBe(403);
    const missing = await t.get("/api/skills/alice/nope");
    expect(missing.status).toBe(400);
    expect((await json(missing)).error.code).toBe("NOT_FOUND");
  });
});

describe("下载", () => {
  it("HTTP → 200 流式 zip;HTTPS → 302 预签名;两种都计数", async () => {
    const t = setup();
    await t.upload(weatherPackage("1.0.0"));

    const streamed = await t.get(download("1.0.0"));
    expect(streamed.status).toBe(200);
    expect(streamed.headers.get("content-disposition")).toBe('attachment; filename="weather-1.0.0.zip"');
    const files = unzipSync(new Uint8Array(await streamed.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(["SKILL.md", "main.py"]);

    const redirected = await t.get(download("1.0.0"), undefined, { "X-Forwarded-Proto": "https" });
    expect(redirected.status).toBe(302);
    expect(redirected.headers.get("location")).toBe("https://storage.test/packages/1/2/bundle.zip?expires=600");

    expect((await json(await t.get(DETAIL))).downloadCount).toBe(2);
    expect(t.db.state.stats.get(2)?.downloadCount).toBe(2);
  });

  it("整包丢失 → 降级现打,不写回", async () => {
    const t = setup();
    await t.upload(weatherPackage("1.0.0"));
    t.storage.objects.delete(bundleKey(1, 2));

    const res = await t.get(download("1.0.0"));
    expect(res.status).toBe(200);
    const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
    expect(strFromU8(files["main.py"]!)).toBe("print('sunny')\n");
    expect(t.storage.objects.has(bundleKey(1, 2))).toBe(false);
  });

  it("版本已下架 → 400;版本不存在 → 400;未通过门禁不计数", async () => {
    const t = setup();
    await t.upload(weatherPackage("1.0.0"));
    await t.del(`${DETAIL}/versions/1.0.0`, "alice");
    expect((await t.get(download("1.0.0"), "alice")).status).toBe(400);
    expect((await t.get(download("9.9.9"))).status).toBe(400);
    expect((await json(await t.get(DETAIL, "alice"))).downloadCount).toBe(0);
  });
});

describe("版本下架", () => {
  it("下架 headline → 回退到最近发布且未下架的版本;全下架 → null", async () => {
    const t = setup();
    await t.upload(weatherPackage("1.0.0"));
    t.clock.advance(1000);
    await t.upload(weatherPackage("1.1.0"));

    const res = await t.del(`${DETAIL}/versions/1.1.0`, "alice");
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({
      user_id: "alice",
      slug: "weather",
      version: "1.1.0",
      status: "YANKED",
      yankedAt: "2026-10-10T09:30:06.000Z",
    });
    expect((await json(await t.get(DETAIL))).headlineVersion).toBe("1.0.0");

    await t.del(`${DETAIL}/versions/1.0.0`, "alice");
    expect((await json(await t.get(DETAIL))).headlineVersion).toBeNull();
  });

  it("未登录 → 401;URL 里的 user_id 与身份头不一致 → 403", async () => {
    const t = setup();
    await t.upload(weatherPackage("1.0.0"));
    expect((await t.del(`${DETAIL}/versions/1.0.0`)).status).toBe(401);
    expect((await t.del(`${DETAIL}/versions/1.0.0`, "bob")).status).toBe(403);
  });
});

describe("技能下架(03 §8.4)", () => {
  it("搜不到(含作者);非作者详情 / 下载 403;作者仍可看可下", async () => {
    const t = setup();
    await t.upload(weatherPackage("1.0.0"));
    const res = await t.del(DETAIL, "alice");
    expect(await json(res)).toEqual({ user_id: "alice", slug: "weather", hidden: true, updatedAt: "2026-10-10T09:30:05.000Z" });

    expect((await json(await t.get("/api/skills?user_id=me", "alice"))).total).toBe(0);
    expect((await t.get(DETAIL, "bob")).status).toBe(403);
    expect((await t.get(download("1.0.0"))).status).toBe(403);
    expect((await json(await t.get(DETAIL, "alice"))).hidden).toBe(true);
    expect((await t.get(download("1.0.0"), "alice")).status).toBe(200);
  });
});

describe("标签(03 §1.7)", () => {
  it("上传写入、每次上传覆盖;详情返回 tags", async () => {
    const t = setup();
    const res = await t.upload(weatherPackage("1.0.0"), { user: "alice", tags: "teaching,primary" });
    expect((await json(res)).tags).toEqual(["teaching", "primary"]);
    await t.upload(weatherPackage("1.1.0"), { user: "alice", tags: "learning" });
    expect((await json(await t.get(DETAIL))).tags).toEqual(["learning"]);
  });

  it("搜索传多个标签须同时满足", async () => {
    const t = setup();
    await t.upload(weatherPackage(), { user: "alice", tags: "teaching,primary" });
    await t.upload(makeZip({ "SKILL.md": skillMd({ name: "Calendar", description: "日历" }) }), {
      user: "alice",
      tags: "teaching,junior",
    });
    const slugs = async (tags: string) =>
      (await json(await t.get(`/api/skills?tags=${tags}`))).items.map((i: { slug: string }) => i.slug).sort();
    expect(await slugs("teaching")).toEqual(["calendar", "weather"]);
    expect(await slugs("teaching,primary")).toEqual(["weather"]);
  });

  it("词表外的值:上传 400,搜索 400", async () => {
    const t = setup();
    expect((await t.upload(weatherPackage(), { user: "alice", tags: "writing" })).status).toBe(400);
    expect((await t.get("/api/skills?tags=writing")).status).toBe(400);
  });
});

describe("搜索", () => {
  it("可见性:PUBLIC + 自己的 PRIVATE;user_id=me 列出自己的全部", async () => {
    const t = setup();
    await t.upload(weatherPackage());
    await t.upload(makeZip({ "SKILL.md": skillMd({ name: "Secret", description: "私有" }) }), {
      user: "alice",
      visibility: "PRIVATE",
    });
    await t.upload(makeZip({ "SKILL.md": skillMd({ name: "Calendar", description: "日历" }) }), { user: "bob" });

    const slugs = async (path: string, user?: string) =>
      (await json(await t.get(path, user))).items.map((i: { slug: string }) => i.slug).sort();
    expect(await slugs("/api/skills")).toEqual(["calendar", "weather"]);
    expect(await slugs("/api/skills", "alice")).toEqual(["calendar", "secret", "weather"]);
    expect(await slugs("/api/skills?user_id=me", "alice")).toEqual(["secret", "weather"]);
    expect(await slugs("/api/skills?q=天气")).toEqual(["weather"]);
  });

  it("total 是命中总数,items 只是当前页;翻页越界 items 为空", async () => {
    const t = setup();
    await t.upload(weatherPackage());
    await t.upload(makeZip({ "SKILL.md": skillMd({ name: "Calendar", description: "日历" }) }));
    const page0 = await json(await t.get("/api/skills?size=1"));
    expect([page0.items.length, page0.total, page0.page, page0.size]).toEqual([1, 2, 0, 1]);
    const beyond = await json(await t.get("/api/skills?page=5&size=1"));
    expect([beyond.items.length, beyond.total]).toEqual([0, 2]);
  });

  it.each([
    ["size=0", 400],
    ["size=101", 400],
    ["page=-1", 400],
    ["sort=hot", 400],
    ["user_id=me", 401],
  ])("%s → %i", async (query, status) => {
    expect((await setup().get(`/api/skills?${query}`)).status).toBe(status);
  });

  it("匿名每分钟 20 次,超出 → 429", async () => {
    const t = setup();
    for (let i = 0; i < 20; i++) expect((await t.get("/api/skills")).status).toBe(200);
    const res = await t.get("/api/skills");
    expect(res.status).toBe(429);
    expect((await json(res)).error.code).toBe("RATE_LIMITED");
  });
});
