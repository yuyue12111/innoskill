import { screen, within } from '@testing-library/react'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import { useIdentity } from '@/auth/identity'
import { saveBlob } from '@/lib/download'
import { server } from '@/mocks/node'
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('“rubric”')
  })
})

describe('导航栏搜索', () => {
  it('在详情页搜：跳到列表页按关键词搜', async () => {
    const { router, user } = renderApp(BOB_SKILL)
    await screen.findByRole('heading', { name: 'argument-structure-scaffold-generator' })

    await user.type(screen.getByRole('textbox', { name: '搜索技能' }), 'rubric{Enter}')
    expect(router.state.location.pathname).toBe('/')
    expect(router.state.location.search).toBe('?q=rubric')
    expect(await screen.findByText('single-point-rubric-designer')).toBeInTheDocument()
  })

  it('在列表页搜：保留场景、学段筛选，排序和页码复位', async () => {
    const { router, user } = renderApp('/?scene=assessment&sort=newest&page=1')
    const box = screen.getByRole('textbox', { name: '搜索技能' })

    await user.type(box, 'rubric{Enter}')
    expect(router.state.location.search).toBe('?scene=assessment&q=rubric')
    // 页内搜索框跟着显示同一个关键词
    expect(screen.getByLabelText('关键词')).toHaveValue('rubric')
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

  it('没有结果时说清是哪些条件没有交集，并能一键清空', async () => {
    const { router, user } = renderApp('/?q=zzzz&scene=research')
    expect(await screen.findByText('没有同时符合“zzzz”和“科研”的技能')).toBeInTheDocument()

    // 页头和空态各有一个「清空筛选」，点空态里的
    await user.click(screen.getAllByRole('button', { name: '清空筛选' }).at(-1)!)
    expect(router.state.location.search).toBe('')
    expect(await screen.findByText('113')).toBeInTheDocument()
  })
})

describe('搜索页 · 排序', () => {
  it('没有关键词默认下载最多，有关键词默认最相关；改排序写进 URL', async () => {
    const sorts: (string | null)[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname === '/api/skills') sorts.push(url.searchParams.get('sort'))
    })
    const { router, user } = renderApp('/')
    await screen.findByText('113')
    const select = () => screen.getByRole('combobox', { name: '排序' })
    expect(select()).toHaveValue('downloads')
    expect(sorts.at(-1)).toBe('downloads')
    // 没有关键词时「最相关」没有意义
    expect(within(select()).queryByRole('option', { name: '最相关' })).not.toBeInTheDocument()

    await user.selectOptions(select(), '最新发布')
    expect(router.state.location.search).toBe('?sort=newest')

    // 新关键词按它自己的默认排序
    await user.type(screen.getByLabelText('关键词'), 'rubric')
    await user.click(screen.getByRole('button', { name: '搜索' }))
    expect(router.state.location.search).toBe('?q=rubric')
    expect(select()).toHaveValue('relevance')
    await screen.findByText('single-point-rubric-designer')
    expect(sorts.at(-1)).toBe('relevance')
    server.events.removeAllListeners()
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

  it('从筛选后的列表进来，返回链接带着筛选回去', async () => {
    const { router, user } = renderApp('/?scene=assessment')
    const [card] = await screen.findAllByRole('article')
    await user.click(within(card).getByRole('link'))

    await user.click(await screen.findByRole('link', { name: '返回全部技能（评价）' }))
    expect(router.state.location.pathname).toBe('/')
    expect(router.state.location.search).toBe('?scene=assessment')
  })

  it('直接打开详情页，返回全部技能', async () => {
    renderApp(BOB_SKILL)
    expect(await screen.findByRole('link', { name: '返回全部技能' })).toHaveAttribute('href', '/')
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

  it('选的标签随上传提交，详情页场景逐个显示、学段合成一个', async () => {
    as('alice')
    const zip = zipSync({ 'SKILL.md': strToU8('---\nname: demo-tags\ndescription: 测试\n---\n') })
    const { user } = renderApp('/upload')
    await user.upload(screen.getByLabelText('技能包'), new File([zip], 'demo.zip', { type: 'application/zip' }))
    await user.click(screen.getByRole('button', { name: '教学' }))
    await user.click(screen.getByRole('button', { name: '小学' }))
    expect(screen.getByRole('button', { name: '小学' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '上传' }))

    expect(await screen.findByRole('heading', { name: 'demo-tags' })).toBeInTheDocument()
    const tags = within(screen.getByRole('list', { name: '标签' })).getAllByRole('listitem')
    expect(tags.map((t) => t.textContent)).toEqual(['教学', '小学'])
  })

  it('zip 超过 10 MB 就地提示，不发请求', async () => {
    as('alice')
    const requests: string[] = []
    server.events.on('request:start', ({ request }) => requests.push(`${request.method} ${new URL(request.url).pathname}`))
    const { user } = renderApp('/upload')
    const big = new File([new Uint8Array(10 * 1024 * 1024)], 'big.zip', { type: 'application/zip' })
    await user.upload(screen.getByLabelText('技能包'), big)
    await user.click(screen.getByRole('button', { name: '上传' }))

    expect(await screen.findByText('zip 文件不能超过 10 MB，请精简后再上传')).toBeInTheDocument()
    expect(requests).not.toContain('POST /api/skills')
    server.events.removeAllListeners()
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
