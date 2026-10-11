// mock 后端的内存数据。只模拟 03 对外可见的行为，不模拟库表。
import { strToU8 } from 'fflate'
import type { Visibility, VersionStatus } from '@/api/types'
import type { TagKey } from '@/lib/tags'
import seed from './seed.json'

export interface MockVersion {
  version: string
  status: VersionStatus
  files: Record<string, Uint8Array>
  publishedAt: string
  yankedAt: string | null
}

export interface MockSkill {
  user_id: string
  slug: string
  skill_name: string
  summary: string
  visibility: Visibility
  tags: TagKey[]
  hidden: boolean
  downloadCount: number
  /** 下架 headline 版本时回退，可能为 null（03 §7.4） */
  headlineVersion: string | null
  versions: MockVersion[]
  /** 搜索索引异步重建（03 §3.1）：此刻之前搜不到 */
  searchableAt: number
}

/** 上传后多久才能搜到 */
export const INDEX_DELAY_MS = 3000

const SEED_USERS = ['alice', 'bob', 'carol']
const SEED_START = Date.parse('2026-09-01T00:00:00Z')

/** 省略 version 时服务端生成 yyyyMMdd.HHmmss（03 §3.2） */
export function timestampVersion(date: Date): string {
  return date.toISOString().slice(0, 19).replace(/-/g, '').replace('T', '.').replace(/:/g, '')
}

function skillMd(name: string, description: string, version: string) {
  return strToU8(`---\nname: ${name}\ndescription: ${JSON.stringify(description)}\nversion: ${version}\n---\n`)
}

function buildSeed(): MockSkill[] {
  const skills = seed.map((s, i): MockSkill => {
    const publishedAt = new Date(SEED_START + i * 7 * 3600_000)
    const version = s.version ?? timestampVersion(publishedAt)
    return {
      user_id: SEED_USERS[i % SEED_USERS.length],
      slug: s.name,
      skill_name: s.name,
      summary: s.description,
      visibility: 'PUBLIC',
      tags: s.tags as TagKey[],
      hidden: false,
      downloadCount: (i * 37) % 500,
      headlineVersion: version,
      versions: [
        {
          version,
          status: 'PUBLISHED',
          files: { 'SKILL.md': skillMd(s.name, s.description, version) },
          publishedAt: publishedAt.toISOString(),
          yankedAt: null,
        },
      ],
      searchableAt: 0,
    }
  })

  // 几个特殊状态，方便切身份看效果
  skills[0].visibility = 'PRIVATE' // alice 的私有技能
  skills[3].hidden = true // alice 的已下架技能
  const multi = skills[1] // bob：多版本，含一个已下架版本
  const files = multi.versions[0].files
  multi.versions.unshift(
    { version: '0.9.0', status: 'PUBLISHED', files, publishedAt: '2026-08-20T08:00:00.000Z', yankedAt: null },
    {
      version: '0.9.1',
      status: 'YANKED',
      files,
      publishedAt: '2026-08-25T08:00:00.000Z',
      yankedAt: '2026-08-26T08:00:00.000Z',
    },
  )
  return skills
}

let skills: MockSkill[] = buildSeed()

export const db = {
  all: () => skills,
  find: (userId: string, slug: string) => skills.find((s) => s.user_id === userId && s.slug === slug),
  insert: (skill: MockSkill) => void skills.push(skill),
}

export function resetDb() {
  skills = buildSeed()
}
