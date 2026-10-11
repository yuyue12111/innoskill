// 按 03 模拟六个接口。判定顺序、状态码与 03 的判定表一致，报错文案与后端 server/src 一致；03 改了这里跟着改。
import { zipSync } from 'fflate'
import { http, HttpResponse } from 'msw'
import type {
  ErrorBody,
  ErrorCode,
  HideResult,
  SearchResult,
  SkillDetail,
  SkillSummary,
  SortBy,
  UploadResult,
  UploadWarning,
  YankResult,
} from '@/api/types'
import { db, INDEX_DELAY_MS, timestampVersion, type MockSkill } from './db'
import { isPackageError, parseTags, readFrontmatter, readPackage, scanWarnings, toSlug } from './package'

const fail = (status: number, code: ErrorCode, message: string, warnings?: UploadWarning[]) =>
  HttpResponse.json<ErrorBody>(
    { error: { code, message, ...(warnings && { details: { warnings } }) } },
    { status },
  )

const caller = (request: Request) => request.headers.get('X-User-Id') || null
const now = () => new Date().toISOString()
const sizeOf = (files: Record<string, Uint8Array>) =>
  Object.values(files).reduce((sum, bytes) => sum + bytes.length, 0)
const headline = (s: MockSkill) => s.versions.find((v) => v.version === s.headlineVersion)
const MAX_BODY_BYTES = 10 * 1024 * 1024
const VERSION_FORMAT = /^[A-Za-z0-9._-]{1,64}$/

// 03：平台无用户表，user_name 目前等于 user_id
function toSummary(s: MockSkill): SkillSummary {
  return {
    user_id: s.user_id,
    slug: s.slug,
    skill_name: s.skill_name,
    summary: s.summary,
    user_name: s.user_id,
    visibility: s.visibility,
    tags: s.tags,
    downloadCount: s.downloadCount,
    headlineVersion: s.headlineVersion,
    publishedAt: headline(s)?.publishedAt ?? null,
  }
}

function toDetail(s: MockSkill): SkillDetail {
  return {
    ...toSummary(s),
    hidden: s.hidden,
    versions: s.versions.map((v) => ({
      version: v.version,
      status: v.status,
      fileCount: Object.keys(v.files).length,
      totalSize: sizeOf(v.files),
      downloadReady: true,
      publishedAt: v.publishedAt,
      yankedAt: v.yankedAt,
      isHeadline: v.version === s.headlineVersion,
    })),
  }
}

/** 解析整数参数：缺省用默认值，非整数返回 null */
function intParam(raw: string | null, fallback: number): number | null {
  if (raw === null) return fallback
  const n = Number(raw)
  return Number.isInteger(n) ? n : null
}

const SORTS: SortBy[] = ['newest', 'downloads', 'relevance']

type Res<T> = T | ErrorBody
type SkillParams = { userId: string; slug: string }
type VersionParams = SkillParams & { version: string }

export const handlers = [
  // 03 §3 上传
  http.post<never, never, Res<UploadResult>>('/api/skills', async ({ request }) => {
    const me = caller(request)
    if (!me) return fail(401, 'UNAUTHORIZED', '需要登录')

    const form = await request.formData()
    const file = form.get('file')
    const visibility = form.get('visibility') ?? 'PUBLIC'
    const confirmWarnings = form.get('confirmWarnings') === 'true'
    if (!file || typeof file === 'string') return fail(400, 'BAD_REQUEST', '缺少上传文件（file 字段）')
    if (file.size > MAX_BODY_BYTES) return fail(400, 'BAD_REQUEST', '上传内容超过 10 MB')
    if (visibility !== 'PUBLIC' && visibility !== 'PRIVATE') {
      return fail(400, 'BAD_REQUEST', `visibility 取值非法：${visibility}`)
    }
    const rawTags = form.get('tags')

    let files, meta, slug, tags
    try {
      tags = parseTags(typeof rawTags === 'string' ? rawTags : null)
      files = readPackage(new Uint8Array(await file.arrayBuffer()))
      meta = readFrontmatter(files['SKILL.md'])
      slug = toSlug(meta.name)
    } catch (e) {
      if (isPackageError(e)) return fail(400, 'BAD_REQUEST', e.message)
      throw e
    }

    const publishedAt = new Date()
    const version = meta.version || timestampVersion(publishedAt)
    if (!VERSION_FORMAT.test(version)) {
      return fail(400, 'BAD_REQUEST', `版本号格式不正确：${version}（1–64 位，只能含字母、数字和 . _ -）`)
    }
    const existing = db.find(me, slug)
    const sameVersion = existing?.versions.find((v) => v.version === version)
    if (sameVersion?.status === 'PUBLISHED') return fail(400, 'BAD_REQUEST', `版本 ${version} 已存在`)

    // 硬性校验都过了才看告警，免得用户确认完告警又撞上硬错误
    const warnings = scanWarnings(files)
    if (warnings.length > 0 && !confirmWarnings) {
      return fail(400, 'BAD_REQUEST', '技能包有告警，确认无误后请带 confirmWarnings=true 重新上传', warnings)
    }

    const row = {
      version,
      status: 'PUBLISHED' as const,
      files,
      publishedAt: publishedAt.toISOString(),
      yankedAt: null,
    }
    const skill: MockSkill = existing ?? {
      user_id: me,
      slug,
      skill_name: meta.name,
      summary: meta.description,
      visibility,
      tags,
      hidden: false,
      downloadCount: 0,
      headlineVersion: version,
      versions: [],
      searchableAt: 0,
    }
    // 已下架的同号版本允许覆盖（03 §3.4）
    skill.versions = [...skill.versions.filter((v) => v.version !== version), row]
    Object.assign(skill, {
      skill_name: meta.name,
      summary: meta.description,
      visibility,
      // 每次上传整体覆盖，不传即清空（03 §3.2）
      tags,
      headlineVersion: version,
      searchableAt: Date.now() + INDEX_DELAY_MS,
    })
    if (!existing) db.insert(skill)

    return HttpResponse.json(
      {
        user_id: me,
        slug,
        skill_name: meta.name,
        summary: meta.description,
        visibility,
        tags,
        version,
        status: 'PUBLISHED',
        fileCount: Object.keys(files).length,
        totalSize: sizeOf(files),
        publishedAt: row.publishedAt,
        warnings,
      },
      { status: 201 },
    )
  }),

  // 03 §4 搜索
  http.get<never, never, Res<SearchResult>>('/api/skills', ({ request }) => {
    const me = caller(request)
    const params = new URL(request.url).searchParams
    const sort = (params.get('sort') ?? 'newest') as SortBy
    const page = intParam(params.get('page'), 0)
    const size = intParam(params.get('size'), 20)
    if (!SORTS.includes(sort)) return fail(400, 'BAD_REQUEST', `sort 取值非法：${sort}`)
    if (page === null || page < 0) return fail(400, 'BAD_REQUEST', 'page 必须是 ≥ 0 的整数')
    if (size === null || size < 1 || size > 100) return fail(400, 'BAD_REQUEST', 'size 必须在 1–100 之间')

    let tags
    try {
      tags = parseTags(params.get('tags'))
    } catch (e) {
      if (isPackageError(e)) return fail(400, 'BAD_REQUEST', e.message)
      throw e
    }

    let owner = params.get('user_id') || null
    if (owner === 'me') {
      if (!me) return fail(401, 'UNAUTHORIZED', 'user_id=me 需要登录')
      owner = me
    }

    const q = (params.get('q') ?? '').trim().toLowerCase()
    const score = (s: MockSkill) =>
      q ? (s.skill_name.toLowerCase().includes(q) ? 2 : 0) + (s.summary.toLowerCase().includes(q) ? 1 : 0) : 1
    const newest = (a: MockSkill, b: MockSkill) =>
      (headline(b)?.publishedAt ?? '').localeCompare(headline(a)?.publishedAt ?? '')
    const order: Record<SortBy, (a: MockSkill, b: MockSkill) => number> = {
      newest,
      downloads: (a, b) => b.downloadCount - a.downloadCount,
      relevance: (a, b) => score(b) - score(a) || newest(a, b),
    }

    const hits = db
      .all()
      .filter((s) => !s.hidden && s.searchableAt <= Date.now())
      .filter((s) => s.visibility === 'PUBLIC' || s.user_id === me)
      .filter((s) => !owner || s.user_id === owner)
      // 多个标签须同时满足（03 §4.2）
      .filter((s) => tags.every((t) => s.tags.includes(t)))
      .filter((s) => score(s) > 0)
      .sort(order[sort])

    return HttpResponse.json({
      items: hits.slice(page * size, (page + 1) * size).map(toSummary),
      total: hits.length,
      page,
      size,
    })
  }),

  // 03 §5 详情
  http.get<SkillParams, never, Res<SkillDetail>>('/api/skills/:userId/:slug', ({ request, params }) => {
    const { userId, slug } = params
    const skill = db.find(userId, slug)
    if (!skill) return fail(400, 'NOT_FOUND', `技能不存在：${userId}/${slug}`)
    if (caller(request) !== skill.user_id && (skill.visibility === 'PRIVATE' || skill.hidden)) {
      return fail(403, 'FORBIDDEN', '没有权限')
    }
    return HttpResponse.json(toDetail(skill))
  }),

  // 03 §6 下载：唯一的下载门禁
  http.get<VersionParams>('/api/skills/:userId/:slug/versions/:version/download', ({ request, params }) => {
    const { userId, slug, version } = params
    const skill = db.find(userId, slug)
    if (!skill) return fail(400, 'NOT_FOUND', `技能不存在：${userId}/${slug}`)
    const isOwner = caller(request) === skill.user_id
    if (skill.hidden && !isOwner) return fail(403, 'FORBIDDEN', '没有权限')
    if (skill.visibility === 'PRIVATE' && !isOwner) return fail(403, 'FORBIDDEN', '没有权限')
    const v = skill.versions.find((x) => x.version === version)
    if (!v) return fail(400, 'NOT_FOUND', `版本不存在：${userId}/${slug}@${version}`)
    if (v.status !== 'PUBLISHED' || v.yankedAt) return fail(400, 'BAD_REQUEST', `该版本不可下载：${version}`)

    skill.downloadCount += 1
    return new HttpResponse(zipSync(v.files), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${slug}-${version}.zip"`,
      },
    })
  }),

  // 03 §7 版本下架
  http.delete<VersionParams, never, Res<YankResult>>('/api/skills/:userId/:slug/versions/:version', ({ request, params }) => {
    const { userId, slug, version } = params
    const me = caller(request)
    if (!me) return fail(401, 'UNAUTHORIZED', '需要登录')
    if (me !== userId) return fail(403, 'FORBIDDEN', '只能操作自己的技能')
    const skill = db.find(userId, slug)
    if (!skill) return fail(400, 'NOT_FOUND', `技能不存在：${userId}/${slug}`)
    const v = skill.versions.find((x) => x.version === version)
    if (!v) return fail(400, 'NOT_FOUND', `版本不存在：${userId}/${slug}@${version}`)
    v.status = 'YANKED'
    v.yankedAt ??= now()
    // 下架的是 headline：回退到最近发布且未下架的版本，没有则为 null（03 §7.4）
    if (skill.headlineVersion === version) {
      const fallback = skill.versions
        .filter((x) => x.status === 'PUBLISHED')
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0]
      skill.headlineVersion = fallback?.version ?? null
    }
    return HttpResponse.json({ user_id: userId, slug, version, status: 'YANKED', yankedAt: v.yankedAt })
  }),

  // 03 §8 技能下架
  http.delete<SkillParams, never, Res<HideResult>>('/api/skills/:userId/:slug', ({ request, params }) => {
    const { userId, slug } = params
    const me = caller(request)
    if (!me) return fail(401, 'UNAUTHORIZED', '需要登录')
    if (me !== userId) return fail(403, 'FORBIDDEN', '只能操作自己的技能')
    const skill = db.find(userId, slug)
    if (!skill) return fail(400, 'NOT_FOUND', `技能不存在：${userId}/${slug}`)
    skill.hidden = true
    return HttpResponse.json({ user_id: userId, slug, hidden: true, updatedAt: now() })
  }),
]
