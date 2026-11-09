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

// 工具栏里的结果计数，如「共 29 个技能」；页头的 113 是不带条件的总数，不随筛选变
const resultCount = (n: number) => screen.findByText(`共 ${n} 个技能`)

describe('搜索页', () => {
  it('页头显示技能总数；关键词写进 URL，只列出命中的技能', async () => {
    const { router, user } = renderApp('/')
    expect(await screen.findByText('113')).toBeInTheDocument()

    await user.type(screen.getByLabelText('关键词'), 'rubric')
    await user.click(screen.getByRole('button', { name: '搜索' }))

    expect(await screen.findByText('single-point-rubric-designer')).toBeInTheDocument()
    expect(screen.queryByText('argument-structure-scaffold-generator')).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=rubric')
    expect(screen.getByText('“rubric”')).toBeInTheDocument()
  })

  it('切到列表视图写进 URL，翻页筛选都保留', async () => {
    const { router, user } = renderApp('/?scene=assessment')
    await resultCount(29)
    await user.click(within(screen.getByRole('radiogroup', { name: '视图' })).getByRole('radio', { name: '列表视图' }))
    expect(router.state.location.search).toBe('?scene=assessment&view=list')
  })
})

describe('导航栏搜索', () => {
  it('首页不放导航栏搜索（页头已有大搜索框）', async () => {
    renderApp('/')
    await screen.findByText('113')
    expect(screen.queryByRole('textbox', { name: '搜索技能' })).not.toBeInTheDocument()
  })

  it('在详情页搜：跳到首页按关键词搜', async () => {
    const { router, user } = renderApp(BOB_SKILL)
    await screen.findByRole('heading', { name: 'argument-structure-scaffold-generator' })

    await user.type(screen.getByRole('textbox', { name: '搜索技能' }), 'rubric{Enter}')
    expect(router.state.location.pathname).toBe('/')
    expect(router.state.location.search).toBe('?q=rubric')
    expect(await screen.findByText('single-point-rubric-designer')).toBeInTheDocument()
  })
})

describe('搜索页 · 标签筛选', () => {
  it('每组单选；多组取交集，条件写进 URL 并显示在工具栏', async () => {
    const { router, user } = renderApp('/')
    await resultCount(113)

    await user.click(within(screen.getByRole('radiogroup', { name: '场景' })).getByRole('radio', { name: '评价' }))
    // 种子数据里「评价」有 29 个
    await resultCount(29)
    expect(router.state.location.search).toBe('?scene=assessment')
    expect(screen.queryByText('argument-structure-scaffold-generator')).not.toBeInTheDocument()

    await user.click(within(screen.getByRole('radiogroup', { name: '学段' })).getByRole('radio', { name: '小学' }))
    expect(router.state.location.search).toBe('?scene=assessment&stage=primary')
    expect(screen.getByText('评价 · 小学')).toBeInTheDocument()
  })

  it('学科筛选：随 tags 一起传（学科组待后端加入 03 §1.7）', async () => {
    const tags: (string | null)[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname === '/api/skills') tags.push(url.searchParams.get('tags'))
    })
    const { router, user } = renderApp('/?scene=teaching')
    await user.click(within(await screen.findByRole('radiogroup', { name: '学科' })).getByRole('radio', { name: '语文' }))
    expect(router.state.location.search).toBe('?scene=teaching&subject=chinese')
    expect(await screen.findByText('argument-structure-scaffold-generator')).toBeInTheDocument()
    expect(tags.at(-1)).toBe('teaching,chinese')
    server.events.removeAllListeners()
  })

  it('没有结果时说清是哪些条件没有交集，并能一键清空', async () => {
    const { router, user } = renderApp('/?q=zzzz&scene=research')
    expect(await screen.findByText('没有同时符合“zzzz”和“科研”的技能')).toBeInTheDocument()

    // 工具栏和空态各有一个「清空筛选」，点空态里的
    await user.click(screen.getAllByRole('button', { name: '清空筛选' }).at(-1)!)
    expect(router.state.location.search).toBe('')
    await resultCount(113)
  })
})

describe('搜索页 · 排序', () => {
  it('没有关键词默认热门，有关键词默认最相关；改排序写进 URL', async () => {
    const sorts: (string | null)[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname === '/api/skills' && url.searchParams.get('size') !== '1') sorts.push(url.searchParams.get('sort'))
    })
    const { router, user } = renderApp('/')
    await resultCount(113)
    const sort = () => screen.getByRole('radiogroup', { name: '排序' })
    expect(within(sort()).getByRole('radio', { name: '热门' })).toHaveAttribute('aria-checked', 'true')
    expect(sorts.at(-1)).toBe('downloads')
    // 没有关键词时「最相关」没有意义
    expect(within(sort()).queryByRole('radio', { name: '最相关' })).not.toBeInTheDocument()

    await user.click(within(sort()).getByRole('radio', { name: '最新' }))
    expect(router.state.location.search).toBe('?sort=newest')

    // 新关键词按它自己的默认排序
    await user.type(screen.getByLabelText('关键词'), 'rubric')
    await user.click(screen.getByRole('button', { name: '搜索' }))
    expect(router.state.location.search).toBe('?q=rubric')
    expect(within(sort()).getByRole('radio', { name: '最相关' })).toHaveAttribute('aria-checked', 'true')
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

  it('从筛选后的列表进来，面包屑带着筛选回去', async () => {
    const { router, user } = renderApp('/?scene=assessment')
    const [card] = await screen.findAllByRole('article')
    await user.click(within(card).getByRole('link'))

    await user.click(await screen.findByRole('link', { name: '全部技能（评价）' }))
    expect(router.state.location.pathname).toBe('/')
    expect(router.state.location.search).toBe('?scene=assessment')
  })

  it('直接打开详情页，面包屑回全部技能', async () => {
    renderApp(BOB_SKILL)
    const crumbs = await screen.findByRole('navigation', { name: '面包屑' })
    expect(within(crumbs).getByRole('link', { name: '全部技能' })).toHaveAttribute('href', '/')
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

  it('选的标签随上传提交，详情页按场景 · 学段 · 学科一行显示', async () => {
    as('alice')
    const zip = zipSync({ 'SKILL.md': strToU8('---\nname: demo-tags\ndescription: 测试\n---\n') })
    const { user } = renderApp('/upload')
    await user.upload(screen.getByLabelText('技能包'), new File([zip], 'demo.zip', { type: 'application/zip' }))
    await user.click(screen.getByRole('button', { name: '教学' }))
    await user.click(screen.getByRole('button', { name: '小学' }))
    await user.click(screen.getByRole('button', { name: '数学' }))
    expect(screen.getByRole('button', { name: '小学' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '上传' }))

    expect(await screen.findByRole('heading', { name: 'demo-tags' })).toBeInTheDocument()
    expect(screen.getByLabelText('标签')).toHaveTextContent('教学 · 小学 · 数学')
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

describe('贡献页、指南页', () => {
  it('贡献页的「查看贡献指南」跳到指南的贡献章节', async () => {
    const { router, user } = renderApp('/contribute')
    await user.click(await screen.findByRole('link', { name: '查看贡献指南' }))
    expect(router.state.location.pathname).toBe('/guide')
    expect(router.state.location.hash).toBe('#contribute')
    expect(screen.getByRole('heading', { level: 2, name: '贡献你的技能' })).toBeInTheDocument()
  })

  it('指南目录：点章节展开小节', async () => {
    const { user } = renderApp('/guide')
    const toc = await screen.findByRole('navigation', { name: '指南目录' })
    expect(within(toc).queryByRole('link', { name: '准备 SKILL.md' })).not.toBeInTheDocument()
    await user.click(within(toc).getByRole('button', { name: '贡献你的技能' }))
    expect(within(toc).getByRole('link', { name: '准备 SKILL.md' })).toHaveAttribute('href', '#prepare')
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
