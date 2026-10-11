// 03 的判定表即测试用例：经由前端接口层（src/api）打 mock，两边一起验证。
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  downloadVersion,
  getSkill,
  hideSkill,
  searchSkills,
  uploadSkill,
  yankVersion,
} from '@/api/skills'
import { useIdentity } from '@/auth/identity'
import { db, type MockSkill } from './db'

const as = (userId: string | null) => useIdentity.setState({ userId })

function zipFile(files: Record<string, string>, name = 'skill.zip') {
  const entries = Object.fromEntries(Object.entries(files).map(([p, c]) => [p, strToU8(c)]))
  return new File([zipSync(entries)], name, { type: 'application/zip' })
}

const skillMd = (name: string, version?: string) =>
  `---\nname: ${name}\ndescription: 测试用技能\n${version ? `version: ${version}\n` : ''}---\n`

function addSkill(slug: string, patch: Partial<MockSkill> = {}): MockSkill {
  const skill: MockSkill = {
    user_id: 'alice',
    slug,
    skill_name: slug,
    summary: 'fixture',
    visibility: 'PUBLIC',
    tags: [],
    hidden: false,
    downloadCount: 0,
    headlineVersion: '1.0.0',
    versions: [
      {
        version: '1.0.0',
        status: 'PUBLISHED',
        files: { 'SKILL.md': strToU8(skillMd(slug)) },
        publishedAt: '2026-10-01T00:00:00.000Z',
        yankedAt: null,
      },
    ],
    searchableAt: 0,
    ...patch,
  }
  db.insert(skill)
  return skill
}

const statusOf = (p: Promise<unknown>) =>
  p.then(
    () => 200,
    (e: { status: number }) => e.status,
  )

describe('03 §6.3 下载门禁交叉表', () => {
  const columns = {
    'PUBLIC 已发布': () => addSkill('pub'),
    'PRIVATE 已发布': () => addSkill('priv', { visibility: 'PRIVATE' }),
    技能已下架: () => addSkill('hid', { hidden: true }),
    版本已下架: () => {
      const s = addSkill('yank')
      s.versions[0].status = 'YANKED'
      s.versions[0].yankedAt = '2026-10-02T00:00:00.000Z'
      return s
    },
  }
  const table: [string, string | null, number[]][] = [
    ['匿名', null, [200, 403, 403, 400]],
    ['其他已登录用户', 'bob', [200, 403, 403, 400]],
    ['技能作者', 'alice', [200, 200, 200, 400]],
  ]

  it.each(table)('%s', async (_, who, expected) => {
    const skills = Object.values(columns).map((make) => make())
    as(who)
    const actual = await Promise.all(skills.map((s) => statusOf(downloadVersion(s.user_id, s.slug, '1.0.0'))))
    expect(actual).toEqual(expected)
  })

  it('下载成功返回 zip 并计数 +1', async () => {
    const s = addSkill('dl')
    const { blob, filename } = await downloadVersion('alice', 'dl', '1.0.0')
    expect(filename).toBe('dl-1.0.0.zip')
    expect(blob.size).toBeGreaterThan(0)
    expect(s.downloadCount).toBe(1)
  })
})

describe('03 §5.2 详情访问控制', () => {
  it.each([
    ['任何人 + PUBLIC', {}, 'bob', 200],
    ['作者 + PRIVATE', { visibility: 'PRIVATE' as const }, 'alice', 200],
    ['非作者 + PRIVATE', { visibility: 'PRIVATE' as const }, 'bob', 403],
    ['非作者 + 已下架', { hidden: true }, null, 403],
    ['作者 + 已下架', { hidden: true }, 'alice', 200],
  ])('%s → %i', async (_, patch, who, expected) => {
    addSkill('x', patch)
    as(who)
    expect(await statusOf(getSkill('alice', 'x'))).toBe(expected)
  })

  it('技能不存在 → 400 NOT_FOUND，不是 404', async () => {
    await expect(getSkill('alice', 'nope')).rejects.toMatchObject({ status: 400, code: 'NOT_FOUND' })
  })
})

describe('03 §4 搜索', () => {
  it.each([
    [{ page: -1 }, 400],
    [{ size: 0 }, 400],
    [{ size: 101 }, 400],
    [{ sort: 'hot' as never }, 400],
    [{ user_id: 'me' }, 401],
  ])('越界不回落默认值：%o → %i', async (params, expected) => {
    expect(await statusOf(searchSkills(params))).toBe(expected)
  })

  it('total 是命中总数，不是当前页条数', async () => {
    const res = await searchSkills({ size: 5 })
    expect(res.items).toHaveLength(5)
    expect(res.total).toBeGreaterThan(5)
  })

  it('PRIVATE 只有作者搜得到；已下架连作者也搜不到', async () => {
    addSkill('mine-private', { visibility: 'PRIVATE' })
    addSkill('mine-hidden', { hidden: true })
    const slugs = async () => (await searchSkills({ user_id: 'alice', size: 100 })).items.map((i) => i.slug)

    expect(await slugs()).not.toContain('mine-private')
    as('alice')
    expect(await slugs()).toContain('mine-private')
    expect((await searchSkills({ user_id: 'me', size: 100 })).items.map((i) => i.slug)).not.toContain('mine-hidden')
  })
})

describe('03 §3 上传', () => {
  it('匿名 → 401', async () => {
    const file = zipFile({ 'SKILL.md': skillMd('demo') })
    expect(await statusOf(uploadSkill({ file, visibility: 'PUBLIC', tags: [], confirmWarnings: false }))).toBe(401)
  })

  it('有告警：先 400 带 warnings，确认后 201 并回传 warnings', async () => {
    as('alice')
    const file = zipFile({ 'SKILL.md': skillMd('demo'), 'tool.exe': 'x' })
    await expect(uploadSkill({ file, visibility: 'PUBLIC', tags: [], confirmWarnings: false })).rejects.toMatchObject({
      status: 400,
      details: { warnings: [{ code: 'EXTENSION_NOT_ALLOWED', filePath: 'tool.exe' }] },
    })
    const res = await uploadSkill({ file, visibility: 'PUBLIC', tags: [], confirmWarnings: true })
    expect(res).toMatchObject({ slug: 'demo', status: 'PUBLISHED', warnings: [{ filePath: 'tool.exe' }] })
  })

  it('硬错误不带 warnings：缺 SKILL.md', async () => {
    as('alice')
    const file = zipFile({ 'README.md': 'hi', 'tool.exe': 'x' })
    await expect(uploadSkill({ file, visibility: 'PUBLIC', tags: [], confirmWarnings: false })).rejects.toMatchObject({
      status: 400,
      details: {},
    })
  })

  it('多套一层文件夹会被剥掉；省略 version 时生成 yyyyMMdd.HHmmss', async () => {
    as('alice')
    const file = zipFile({ 'demo/SKILL.md': skillMd('Demo Skill'), 'demo/__MACOSX/x': '' })
    const res = await uploadSkill({ file, visibility: 'PUBLIC', tags: [], confirmWarnings: false })
    expect(res).toMatchObject({ slug: 'demo-skill', fileCount: 1 })
    expect(res.version).toMatch(/^\d{8}\.\d{6}$/)
  })

  it('详情立刻可见，搜索要等索引重建', async () => {
    as('alice')
    await uploadSkill({ file: zipFile({ 'SKILL.md': skillMd('fresh') }), visibility: 'PUBLIC', tags: [], confirmWarnings: false })
    expect((await getSkill('alice', 'fresh')).slug).toBe('fresh')
    expect((await searchSkills({ q: 'fresh' })).items).toHaveLength(0)
  })

  it('同版本已发布 → 400；下架后可用同版本号覆盖', async () => {
    as('alice')
    const upload = () =>
      uploadSkill({ file: zipFile({ 'SKILL.md': skillMd('dup', '1.0.0') }), visibility: 'PUBLIC', tags: [], confirmWarnings: false })
    await upload()
    expect(await statusOf(upload())).toBe(400)
    await yankVersion('alice', 'dup', '1.0.0')
    expect(await statusOf(upload())).toBe(200)
    expect(await statusOf(downloadVersion('alice', 'dup', '1.0.0'))).toBe(200)
    expect((await getSkill('alice', 'dup')).versions[0]).toMatchObject({ status: 'PUBLISHED', yankedAt: null })
  })

  it.each([
    ['版本号格式不合法', zipFile({ 'SKILL.md': skillMd('bad-version', '1.0 beta') })],
    ['请求体 > 10 MB', new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.zip')],
  ])('%s → 400', async (_, file) => {
    as('alice')
    expect(await statusOf(uploadSkill({ file, visibility: 'PUBLIC', tags: [], confirmWarnings: false }))).toBe(400)
  })
})

describe('03 §7.4 下架 headline 版本时回退', () => {
  it('回退到最近发布且未下架的版本，没有则为 null', async () => {
    const s = addSkill('hl')
    s.versions.unshift({ ...s.versions[0], version: '0.9.0', publishedAt: '2026-09-01T00:00:00.000Z' })
    as('alice')

    await yankVersion('alice', 'hl', '1.0.0')
    expect(await getSkill('alice', 'hl')).toMatchObject({ headlineVersion: '0.9.0', publishedAt: '2026-09-01T00:00:00.000Z' })
    await yankVersion('alice', 'hl', '0.9.0')
    expect(await getSkill('alice', 'hl')).toMatchObject({ headlineVersion: null, publishedAt: null })
  })
})

describe('03 §7 / §8 下架', () => {
  it.each([
    ['匿名', null, 401],
    ['非作者', 'bob', 403],
    ['作者', 'alice', 200],
  ])('%s 下架 → %i', async (_, who, expected) => {
    addSkill('t')
    as(who)
    expect(await statusOf(yankVersion('alice', 't', '1.0.0'))).toBe(expected)
    expect(await statusOf(hideSkill('alice', 't'))).toBe(expected)
  })

  it('版本下架后连作者也下不了；技能下架后作者仍可看可下', async () => {
    addSkill('a')
    addSkill('b')
    as('alice')
    await yankVersion('alice', 'a', '1.0.0')
    await hideSkill('alice', 'b')
    expect(await statusOf(downloadVersion('alice', 'a', '1.0.0'))).toBe(400)
    expect(await statusOf(downloadVersion('alice', 'b', '1.0.0'))).toBe(200)
    expect((await getSkill('alice', 'b')).hidden).toBe(true)
  })
})

describe('03 §1.7 标签', () => {
  const upload = (tags: string, name = 'tagged', version?: string) =>
    uploadSkill({
      file: zipFile({ 'SKILL.md': skillMd(name, version) }),
      visibility: 'PUBLIC',
      tags: tags ? (tags.split(',') as never) : [],
      confirmWarnings: false,
    })

  it('搜索传多个标签时须同时满足', async () => {
    addSkill('both', { tags: ['teaching', 'primary'] })
    addSkill('scene-only', { tags: ['teaching'] })
    const slugs = async (tags: string[]) =>
      (await searchSkills({ user_id: 'alice', tags: tags as never, size: 100 })).items.map((i) => i.slug)

    expect(await slugs(['teaching'])).toEqual(expect.arrayContaining(['both', 'scene-only']))
    const both = await slugs(['teaching', 'primary'])
    expect(both).toContain('both')
    expect(both).not.toContain('scene-only')
  })

  it('词表外的标签 → 400（搜索与上传都是）', async () => {
    expect(await statusOf(searchSkills({ tags: ['math' as never] }))).toBe(400)
    as('alice')
    await expect(upload('teaching,math')).rejects.toMatchObject({ status: 400, message: '未知标签：math' })
  })

  it('上传带回 tags；每次上传整体覆盖，不传即清空', async () => {
    as('alice')
    expect((await upload('teaching,primary', 'tagged', '1.0.0')).tags).toEqual(['teaching', 'primary'])
    expect((await getSkill('alice', 'tagged')).tags).toEqual(['teaching', 'primary'])
    await upload('', 'tagged', '1.0.1')
    expect((await getSkill('alice', 'tagged')).tags).toEqual([])
  })

  it('SKILL.md 的 name 含中文 → 400，message 原样给出', async () => {
    as('alice')
    await expect(upload('', '天气助手')).rejects.toMatchObject({ status: 400, message: 'name 必须是英文：天气助手' })
  })
})
