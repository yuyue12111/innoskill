import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { badRequest, unauthorized } from "../domain/errors.js";
import { VISIBILITIES, type Skill, type SkillVersion } from "../domain/model.js";
import { parseTags } from "../domain/tags.js";
import type { AppEnv } from "../middleware/identity.js";
import type { RateLimiter } from "../middleware/rateLimit.js";
import type { Deps } from "../usecases/deps.js";
import { downloadVersion, type DownloadResult } from "../usecases/download.js";
import { getSkillDetail } from "../usecases/getDetail.js";
import { hideSkill } from "../usecases/hideSkill.js";
import { publishSkill, type PublishResult } from "../usecases/publish.js";
import { searchSkills, type SearchHit } from "../usecases/search.js";
import { yankVersion } from "../usecases/yankVersion.js";

const MAX_BODY_BYTES = 10 * 1024 * 1024;

// 参数校验的报错也用中文
z.config(z.locales.zhCN());

const uploadForm = z.object({
  visibility: z.enum(VISIBILITIES).default("PUBLIC"),
  tags: z.string().optional(),
  confirmWarnings: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const searchParams = z.object({
  q: z.string().trim().optional(),
  user_id: z.string().trim().min(1).optional(),
  tags: z.string().optional(),
  sort: z.enum(["newest", "downloads", "relevance"]).default("newest"),
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

/** 6 个接口(03 §2),挂在 /api/skills 下 */
export function createSkillRoutes(deps: Deps, rateLimit: RateLimiter): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.post(
    "/",
    rateLimit("upload", { anonymous: null, user: 10 }),
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: () => {
        throw badRequest("上传内容超过 10 MB");
      },
    }),
    async (c) => {
      const requester = c.get("requester");
      if (!requester) throw unauthorized();
      const body = await c.req.parseBody();
      const form = parse(uploadForm, body);
      if (!(body.file instanceof File)) throw badRequest("缺少上传文件（file 字段）");
      const result = await publishSkill(deps, {
        requester,
        zip: new Uint8Array(await body.file.arrayBuffer()),
        visibility: form.visibility,
        tags: parseTags(form.tags),
        confirmWarnings: form.confirmWarnings,
      });
      return c.json(presentPublish(result), 201);
    },
  );

  routes.get("/", rateLimit("search", { anonymous: 20, user: 60 }), async (c) => {
    const query = parse(searchParams, c.req.query());
    const { hits, total } = await searchSkills(deps, {
      requester: c.get("requester"),
      q: query.q || null,
      userId: query.user_id,
      tags: parseTags(query.tags),
      sort: query.sort,
      page: query.page,
      size: query.size,
    });
    return c.json({ items: hits.map(presentSearchItem), total, page: query.page, size: query.size });
  });

  routes.get("/:userId/:slug", async (c) => {
    const { userId, slug } = c.req.param();
    const detail = await getSkillDetail(deps, { requester: c.get("requester"), userId, slug });
    return c.json(presentDetail(detail.skill, detail.versions));
  });

  routes.get(
    "/:userId/:slug/versions/:version/download",
    rateLimit("download", { anonymous: 30, user: 120 }),
    async (c) => {
      const { userId, slug, version } = c.req.param();
      const isSecure =
        c.req.header("x-forwarded-proto") === "https" || new URL(c.req.url).protocol === "https:";
      const result = await downloadVersion(deps, { requester: c.get("requester"), userId, slug, version, isSecure });
      return downloadResponse(result);
    },
  );

  routes.delete(
    "/:userId/:slug/versions/:version",
    rateLimit("yank", { anonymous: null, user: 10 }),
    async (c) => {
      const { userId, slug, version } = c.req.param();
      const yanked = await yankVersion(deps, { requester: c.get("requester"), userId, slug, version });
      return c.json({
        user_id: userId,
        slug,
        version: yanked.version,
        status: yanked.status,
        yankedAt: iso(yanked.yankedAt),
      });
    },
  );

  routes.delete("/:userId/:slug", rateLimit("hide", { anonymous: null, user: 10 }), async (c) => {
    const { userId, slug } = c.req.param();
    const { skill, hiddenAt } = await hideSkill(deps, { requester: c.get("requester"), userId, slug });
    return c.json({ user_id: skill.userId, slug: skill.slug, hidden: skill.hidden, updatedAt: iso(hiddenAt) });
  });

  return routes;
}

function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(result.error.issues.map((i) => `${i.path.join(".")}：${i.message}`).join("；"));
  }
  return result.data;
}

// ---- 响应(字段名照 03,蛇形与驼峰混用是文档原样) ----

const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

function presentPublish({ skill, version, warnings }: PublishResult) {
  return {
    user_id: skill.userId,
    slug: skill.slug,
    skill_name: skill.skillName,
    summary: skill.summary,
    visibility: skill.visibility,
    tags: skill.tags,
    version: version.version,
    status: version.status,
    fileCount: version.fileCount,
    totalSize: version.totalSize,
    publishedAt: iso(version.publishedAt),
    warnings,
  };
}

function presentSearchItem({ skill, headline }: SearchHit) {
  return {
    user_id: skill.userId,
    slug: skill.slug,
    skill_name: skill.skillName,
    summary: skill.summary,
    user_name: skill.userId, // 平台无用户表,目前等于 user_id(03 §4.3)
    visibility: skill.visibility,
    tags: skill.tags,
    downloadCount: skill.downloadCount,
    headlineVersion: headline?.version ?? null,
    publishedAt: iso(headline?.publishedAt),
  };
}

function presentDetail(skill: Skill, versions: SkillVersion[]) {
  const headline = versions.find((v) => v.id === skill.latestVersionId);
  return {
    user_id: skill.userId,
    slug: skill.slug,
    skill_name: skill.skillName,
    summary: skill.summary,
    visibility: skill.visibility,
    tags: skill.tags,
    hidden: skill.hidden,
    user_name: skill.userId,
    downloadCount: skill.downloadCount,
    headlineVersion: headline?.version ?? null,
    publishedAt: iso(headline?.publishedAt),
    versions: versions.map((v) => ({
      version: v.version,
      status: v.status,
      fileCount: v.fileCount,
      totalSize: v.totalSize,
      downloadReady: v.downloadReady,
      publishedAt: iso(v.publishedAt),
      yankedAt: iso(v.yankedAt),
      isHeadline: v.id === skill.latestVersionId,
    })),
  };
}

function downloadResponse(result: DownloadResult): Response {
  if (result.kind === "redirect") return new Response(null, { status: 302, headers: { Location: result.url } });
  const headers: Record<string, string> = {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${result.filename}"`,
  };
  if (result.kind === "stream") {
    if (result.size !== null) headers["Content-Length"] = String(result.size);
    return new Response(result.body, { headers });
  }
  headers["Content-Length"] = String(result.body.length);
  return new Response(result.body, { headers });
}
