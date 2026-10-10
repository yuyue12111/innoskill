import { screen, within } from '@testing-library/react'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import { useIdentity } from '@/auth/identity'
import { saveBlob } from '@/lib/download'
import { renderApp } from '@/test/renderApp'

vi.mock('@/lib/download', () => ({ saveBlob: vi.fn() }))

const as = (userId: string | null) => useIdentity.setState({ userId })
// 种子数据（src/mocks/db.ts）：bob 的多版本技能、alice 的私有技能
const BOB_SKILL = '/skills/bob/argument-structure-scaffold-generator'
const ALICE_PRIVATE = '/skills/alice/ai-hallucination-fact-check-protocol'

describe('搜索页', () => {
  it('关键词写进 URL，只列出命中的技能', async () => {
    const { router, user } = renderApp('/')
    expect(await screen.findByText('共 113 个技能')).toBeInTheDocument()

    await user.type(screen.getByLabelText('关键词'), 'rubric')
    await user.click(screen.getByRole('button', { name: '搜索' }))

    expect(await screen.findByText('single-point-rubric-designer')).toBeInTheDocument()
    expect(screen.queryByText('argument-structure-scaffold-generator')).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=rubric')
  })
})

describe('详情页', () => {
  it('非作者看私有技能：给出原因而不是空白', async () => {
    as('bob')
    renderApp(ALICE_PRIVATE)
    expect(await screen.findByText('这个技能是私有的或已下架，只有作者能查看')).toBeInTheDocument()
  })

  it('技能不存在（03 返回 400 NOT_FOUND）', async () => {
    renderApp('/skills/alice/nope')
    expect(await screen.findByText('技能不存在，请检查地址')).toBeInTheDocument()
  })

  it('非作者看不到下架入口；已下架版本没有下载按钮', async () => {
    renderApp(BOB_SKILL)
    const row = (await screen.findByText('0.9.1')).closest('tr')!
    expect(within(row).queryByRole('button', { name: '下载' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下架' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下架技能' })).not.toBeInTheDocument()
  })

  it('作者下架版本要二次确认', async () => {
    as('bob')
    const { user } = renderApp(BOB_SKILL)
    const row = (await screen.findByText('0.9.0')).closest('tr')!
    await user.click(within(row).getByRole('button', { name: '下架' }))
    await user.click(await screen.findByRole('button', { name: '下架版本' }))

    expect(await within(row).findByText(/^已下架/)).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: '下载' })).not.toBeInTheDocument()
  })

  it('下载：按确切版本号取 zip，完成后刷新下载数', async () => {
    const { user } = renderApp(BOB_SKILL)
    expect(await screen.findByText('37 次下载')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下载 1.0' }))

    expect(await screen.findByText('38 次下载')).toBeInTheDocument()
    expect(saveBlob).toHaveBeenCalledWith(expect.anything(), 'argument-structure-scaffold-generator-1.0.zip')
  })
})

describe('上传页', () => {
  it('匿名不能上传', async () => {
    renderApp('/upload')
    expect(await screen.findByText('登录后才能上传技能')).toBeInTheDocument()
  })

  it('有告警：列出告警，确认后上传并跳到详情页', async () => {
    as('alice')
    const zip = zipSync({
      'SKILL.md': strToU8('---\nname: demo-upload\ndescription: 测试\n---\n'),
      'tool.exe': strToU8('x'),
    })
    const { router, user } = renderApp('/upload')
    await user.upload(screen.getByLabelText('技能包'), new File([zip], 'demo.zip', { type: 'application/zip' }))
    await user.click(screen.getByRole('button', { name: '上传' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('技能包有 1 条告警')).toBeInTheDocument()
    expect(within(dialog).getByText('tool.exe')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '仍然上传' }))

    expect(await screen.findByRole('heading', { name: 'demo-upload' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/skills/alice/demo-upload')
  })

  it('没选文件时就地提示', async () => {
    as('alice')
    const { user } = renderApp('/upload')
    await user.click(await screen.findByRole('button', { name: '上传' }))
    expect(await screen.findByText('请选择 zip 文件')).toBeInTheDocument()
  })
})
