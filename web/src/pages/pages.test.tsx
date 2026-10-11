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
    // 页头右侧是命中总数（03 §4.3 total）
    expect(await screen.findByText('113')).toBeInTheDocument()

    await user.type(screen.getByLabelText('关键词'), 'rubric')
    await user.click(screen.getByRole('button', { name: '搜索' }))

    expect(await screen.findByText('single-point-rubric-designer')).toBeInTheDocument()
    expect(screen.queryByText('argument-structure-scaffold-generator')).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=rubric')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('「rubric」')
  })
})

describe('搜索页 · 标签筛选', () => {
  it('每组单选；两组取交集，条件写进 URL，标题跟着变', async () => {
    const { router, user } = renderApp('/')
    await screen.findByText('113')

    await user.click(within(screen.getByRole('radiogroup', { name: '场景' })).getByRole('radio', { name: '评价' }))
    // 种子数据里「评价」有 29 个
    expect(await screen.findByText('29')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?scene=assessment')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('评价')
    expect(screen.queryByText('argument-structure-scaffold-generator')).not.toBeInTheDocument()

    await user.click(within(screen.getByRole('radiogroup', { name: '学段' })).getByRole('radio', { name: '小学' }))
    expect(router.state.location.search).toBe('?scene=assessment&stage=primary')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('评价 · 小学')
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
    expect(await screen.findByText('37')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下载 1.0' }))

    expect(await screen.findByText('38')).toBeInTheDocument()
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

  it('选的标签随上传提交，详情页按组显示', async () => {
    as('alice')
    const zip = zipSync({ 'SKILL.md': strToU8('---\nname: demo-tags\ndescription: 测试\n---\n') })
    const { user } = renderApp('/upload')
    await user.upload(screen.getByLabelText('技能包'), new File([zip], 'demo.zip', { type: 'application/zip' }))
    await user.click(screen.getByRole('button', { name: '教学' }))
    await user.click(screen.getByRole('button', { name: '小学' }))
    expect(screen.getByRole('button', { name: '小学' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '上传' }))

    expect(await screen.findByRole('heading', { name: 'demo-tags' })).toBeInTheDocument()
    expect(screen.getByText('场景：')).toBeInTheDocument()
    expect(screen.getByText('教学')).toBeInTheDocument()
    expect(screen.getByText('小学')).toBeInTheDocument()
  })

  it('没选文件时就地提示', async () => {
    as('alice')
    const { user } = renderApp('/upload')
    await user.click(await screen.findByRole('button', { name: '上传' }))
    expect(await screen.findByText('请选择 zip 文件')).toBeInTheDocument()
  })
})

describe('外观切换', () => {
  it('选深色写到 <html data-theme>，选跟随系统时去掉', async () => {
    const { user } = renderApp('/')
    await user.click(await screen.findByRole('radio', { name: '深色' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('radio', { name: '深色' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('radio', { name: '跟随系统' }))
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })
})
