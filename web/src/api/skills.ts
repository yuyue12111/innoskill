// 03 的六个接口，一个接口一个函数。
import { apiFetch, apiJson } from './client'
import type { TagKey } from '@/lib/tags'
import type {
  HideResult,
  SearchParams,
  SearchResult,
  SkillDetail,
  UploadResult,
  Visibility,
  YankResult,
} from './types'

const seg = encodeURIComponent
const skillPath = (userId: string, slug: string) => `/skills/${seg(userId)}/${seg(slug)}`
const versionPath = (userId: string, slug: string, version: string) =>
  `${skillPath(userId, slug)}/versions/${seg(version)}`

/** 03 §3 上传。返回 400 且带 details.warnings 时，确认后以 confirmWarnings=true 重传。 */
export function uploadSkill(input: {
  file: File
  visibility: Visibility
  /** 每次上传整体覆盖，空数组即清空（03 §3.2） */
  tags: TagKey[]
  confirmWarnings: boolean
}): Promise<UploadResult> {
  const form = new FormData()
  form.set('file', input.file)
  form.set('visibility', input.visibility)
  form.set('tags', input.tags.join(','))
  form.set('confirmWarnings', String(input.confirmWarnings))
  return apiJson('/skills', { method: 'POST', body: form })
}

/** 03 §4 搜索 */
export function searchSkills(params: SearchParams): Promise<SearchResult> {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value.join(',') : value
    if (v !== undefined && v !== '') qs.set(key, String(v))
  }
  const query = qs.toString()
  return apiJson(`/skills${query ? `?${query}` : ''}`)
}

/** 03 §5 详情 */
export function getSkill(userId: string, slug: string): Promise<SkillDetail> {
  return apiJson(skillPath(userId, slug))
}

/**
 * 03 §6 下载。用 fetch 而不用 <a href>：私有技能要带身份头，<a> 带不上。
 * 302 到对象存储时 fetch 自动跟随，前提是对象存储配了 CORS（待后端确认）。
 */
export async function downloadVersion(
  userId: string,
  slug: string,
  version: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await apiFetch(`${versionPath(userId, slug, version)}/download`)
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? `${slug}-${version}.zip`
  return { blob: await res.blob(), filename }
}

/** 03 §7 版本下架 */
export function yankVersion(userId: string, slug: string, version: string): Promise<YankResult> {
  return apiJson(versionPath(userId, slug, version), { method: 'DELETE' })
}

/** 03 §8 技能下架 */
export function hideSkill(userId: string, slug: string): Promise<HideResult> {
  return apiJson(skillPath(userId, slug), { method: 'DELETE' })
}
