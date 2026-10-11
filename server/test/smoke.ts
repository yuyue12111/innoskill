// 冒烟测试:对正在运行的后端 + 真实 PG / MinIO / Redis 跑一遍全流程。
// 用法:docker compose up -d → npm run db:migrate → npm run dev → npm run smoke
// 每次用新的作者名和 IP,不依赖、也不影响库里已有数据。
import { strict as assert } from "node:assert";
import { request } from "node:http";
import { S3Client } from "@aws-sdk/client-s3";
import { strToU8, unzipSync, zipSync } from "fflate";
import { createPrismaClient } from "../src/adapters/pg/prisma.js";
import { createS3ObjectStorage } from "../src/adapters/s3/objectStorage.js";
import { loadConfig } from "../src/config.js";
import { bundleKey } from "../src/domain/model.js";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const run = Date.now().toString(36);
const alice = `alice-${run}`;
const ip = `smoke-${run}`; // 匿名限流按 IP 计,隔离每次运行

const pkg = (name: string, description: string, version: string) =>
  zipSync({
    [`${name}/SKILL.md`]: strToU8(`---\nname: ${name}\ndescription: ${description}\nversion: ${version}\n---\n# ${name}\n`),
    [`${name}/main.py`]: strToU8("print('ok')\n"),
  });

interface Res {
  status: number;
  headers: Headers;
  json: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  bytes: Uint8Array;
}

async function req(method: string, path: string, opts: { user?: string; body?: FormData; headers?: Record<string, string> } = {}): Promise<Res> {
  const res = await fetch(`${base}${path}`, {
    method,
    body: opts.body,
    redirect: "manual",
    headers: { "X-Forwarded-For": ip, ...(opts.user && { "X-User-Id": opts.user }), ...opts.headers },
  });
  const isJson = res.headers.get("content-type")?.includes("json");
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { status: res.status, headers: res.headers, json: isJson ? JSON.parse(new TextDecoder().decode(bytes)) : null, bytes };
}

const upload = (zip: Uint8Array, user: string, fields: Record<string, string> = {}) => {
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(zip)]), "skill.zip");
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return req("POST", "/api/skills", { user, body: form });
};

const slugs = (r: Res) => r.json.items.map((i: { slug: string }) => i.slug).sort();
const skillPath = (slug: string) => `/api/skills/${alice}/${slug}`;
const downloadPath = (slug: string, v: string) => `${skillPath(slug)}/versions/${v}/download`;

async function step(name: string, fn: () => Promise<void>) {
  await fn();
  console.log(`ok  ${name}`);
}

const config = loadConfig();
const prisma = createPrismaClient(config.DATABASE_URL);
const storage = createS3ObjectStorage(
  new S3Client({
    region: config.S3_REGION,
    endpoint: config.S3_ENDPOINT,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials:
      config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY }
        : undefined,
  }),
  config.S3_BUCKET,
);

try {
  await step("上传:带标签,剥根目录", async () => {
    const r = await upload(pkg("Weather", "查询天气预报", "1.0.0"), alice, { tags: "teaching,primary" });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.deepEqual(r.json.tags, ["teaching", "primary"]);
    assert.equal((await upload(pkg("Calendar", "日历和日程安排", "1.0.0"), alice, { tags: "teaching,junior" })).status, 201);
    await new Promise((r) => setTimeout(r, 300)); // 索引在提交后异步重建
  });

  await step("搜索:中文关键词经 jieba 命中", async () => {
    assert.deepEqual(slugs(await req("GET", `/api/skills?user_id=${alice}&q=天气`)), ["weather"]);
  });

  await step("搜索:多个标签须同时满足", async () => {
    assert.deepEqual(slugs(await req("GET", `/api/skills?user_id=${alice}&tags=teaching`)), ["calendar", "weather"]);
    assert.deepEqual(slugs(await req("GET", `/api/skills?user_id=${alice}&tags=teaching,primary`)), ["weather"]);
  });

  await step("搜索:三种排序", async () => {
    for (const sort of ["newest", "downloads", "relevance"]) {
      assert.equal((await req("GET", `/api/skills?user_id=${alice}&q=天气&sort=${sort}`)).status, 200, sort);
    }
  });

  await step("详情", async () => {
    const r = await req("GET", skillPath("weather"));
    assert.equal(r.status, 200);
    assert.equal(r.json.headlineVersion, "1.0.0");
  });

  await step("下载:HTTP → 200 流式 zip", async () => {
    const r = await req("GET", downloadPath("weather", "1.0.0"));
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(unzipSync(r.bytes)).sort(), ["SKILL.md", "main.py"]);
  });

  await step("下载:HTTPS → 302 预签名,链接能下到 zip", async () => {
    const r = await req("GET", downloadPath("weather", "1.0.0"), { headers: { "X-Forwarded-Proto": "https" } });
    assert.equal(r.status, 302);
    const location = r.headers.get("location")!;
    assert.match(location, /bundle\.zip.*X-Amz-Signature=/);
    try {
      const file = await fetch(location);
      assert.equal(file.status, 200);
      assert.ok(unzipSync(new Uint8Array(await file.arrayBuffer()))["SKILL.md"]);
    } catch (err) {
      // 后端跑在容器里时,预签名链接是容器网络地址(minio:9000),宿主机解析不了
      if ((err as { cause?: { code?: string } }).cause?.code !== "ENOTFOUND") throw err;
      console.log(`    跳过链接下载校验:${new URL(location).host} 在本机不可达(容器内地址)`);
    }
    assert.equal((await req("GET", skillPath("weather"))).json.downloadCount, 2);
  });

  await step("下载:整包丢失 → 降级现打,不写回", async () => {
    const skill = await prisma.skill.findUniqueOrThrow({ where: { userId_slug: { userId: alice, slug: "calendar" } } });
    const key = bundleKey(Number(skill.id), Number(skill.latestVersionId));
    await storage.deleteMany([key]);
    const r = await req("GET", downloadPath("calendar", "1.0.0"));
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(unzipSync(r.bytes)).sort(), ["SKILL.md", "main.py"]);
    assert.equal(await storage.exists(key), false);
  });

  await step("版本下架 → headline 置空;同版本号重传覆盖", async () => {
    assert.equal((await req("DELETE", `${skillPath("weather")}/versions/1.0.0`, { user: alice })).status, 200);
    assert.equal((await req("GET", skillPath("weather"))).json.headlineVersion, null);
    assert.equal((await upload(pkg("Weather", "查询天气预报", "1.0.0"), alice)).status, 201);
    assert.equal((await req("GET", skillPath("weather"))).json.versions[0].status, "PUBLISHED");
  });

  await step("技能下架 → 作者也搜不到;非作者详情 403", async () => {
    assert.equal((await req("DELETE", skillPath("weather"), { user: alice })).status, 200);
    assert.deepEqual(slugs(await req("GET", "/api/skills?user_id=me", { user: alice })), ["calendar"]);
    assert.equal((await req("GET", skillPath("weather"), { user: "bob" })).status, 403);
  });

  await step("name 含中文 → 400", async () => {
    assert.equal((await upload(pkg("天气", "查天气", "1.0.0"), alice)).status, 400);
  });

  await step("未登录上传 → 401", async () => {
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(pkg("Anon", "匿名", "1.0.0"))]), "skill.zip");
    assert.equal((await req("POST", "/api/skills", { body: form })).status, 401);
  });

  await step("PRIVATE:只有作者能搜到、看到", async () => {
    assert.equal((await upload(pkg("Secret", "私有技能", "1.0.0"), alice, { visibility: "PRIVATE" })).status, 201);
    await new Promise((r) => setTimeout(r, 300));
    assert.deepEqual(slugs(await req("GET", `/api/skills?user_id=${alice}&q=私有`)), []);
    assert.deepEqual(slugs(await req("GET", `/api/skills?user_id=${alice}&q=私有`, { user: alice })), ["secret"]);
    assert.equal((await req("GET", skillPath("secret"), { user: "bob" })).status, 403);
    assert.equal((await req("GET", skillPath("secret"), { user: alice })).status, 200);
  });

  await step("告警:未确认 → 400 带 warnings;确认后 201", async () => {
    const zip = zipSync({
      "SKILL.md": strToU8("---\nname: Tool\ndescription: 带可执行文件\nversion: 1.0.0\n---\n"),
      "tool.exe": strToU8("MZ"),
    });
    const rejected = await upload(zip, alice);
    assert.equal(rejected.status, 400);
    assert.equal(rejected.json.error.details.warnings[0].code, "EXTENSION_NOT_ALLOWED");
    const accepted = await upload(zip, alice, { confirmWarnings: "true" });
    assert.equal(accepted.status, 201);
    assert.equal(accepted.json.warnings.length, 1);
  });

  await step("请求体 > 10 MB → 400", async () => {
    // 只发请求头:服务端按 Content-Length 直接拒绝。fetch 在服务端提前响应时会报 EPIPE 而拿不到响应,所以用 node:http
    const r = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const headers = {
        "Content-Type": "multipart/form-data; boundary=x",
        "Content-Length": String(10 * 1024 * 1024 + 1),
        "X-User-Id": alice,
        "X-Forwarded-For": ip,
      };
      const call = request(`${base}/api/skills`, { method: "POST", headers }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body });
          call.destroy();
        });
      });
      call.on("error", reject);
      call.flushHeaders();
    });
    assert.equal(r.status, 400);
    assert.equal(JSON.parse(r.body).error.code, "BAD_REQUEST");
  });

  await step("限流:匿名搜索每分钟 20 次,超出 → 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await req("GET", "/api/skills?size=1", { headers: { "X-Forwarded-For": `${ip}-rl` } })).status);
    assert.deepEqual([statuses[19], statuses[20]], [200, 429]);
  });

  console.log("ALL OK");
} finally {
  await prisma.$disconnect();
}
