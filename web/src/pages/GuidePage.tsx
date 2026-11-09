import { ChevronDown } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Container, PageHero } from '@/components/Page'
import { cn } from '@/lib/utils'

interface Topic {
  id: string
  title: string
  body: ReactNode
}
interface Chapter {
  id: string
  title: string
  topics: Topic[]
}

const Callout = ({ children }: { children: ReactNode }) => (
  <p className="rounded-control border-l-4 border-signal bg-wash px-5 py-4 font-semibold text-wash-ink">{children}</p>
)

const Table = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div className="overflow-x-auto rounded-control border border-line">
    <table className="w-full text-left text-sm">
      <thead className="bg-panel">
        <tr>
          {head.map((h) => (
            <th key={h} className="px-4 py-2.5 font-semibold whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-line-soft align-top">
            {r.map((c, j) => (
              <td key={j} className="px-4 py-2.5">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded-tag bg-panel px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>
)

// 内容以 03 接口文档的实际行为为准；改了接口行为要同步这里
const CHAPTERS: Chapter[] = [
  {
    id: 'intro',
    title: 'InnoSkill 简介',
    topics: [
      {
        id: 'what',
        title: 'InnoSkill 是什么',
        body: (
          <>
            <p>
              InnoSkill 是面向老师、学生和学校管理者的 <strong>教育 AI 技能分发平台</strong>。一个技能（Skill）就是写给 AI
              助手的一份「做事方法」，再加上它需要的模板、示例和资料——比如「按单元目标出一份分层练习」「给作文写分项评语」。AI
              助手装上它，就会按这套方法来做。
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>想用技能</strong>：按场景、学段、学科筛选，找到适合自己课堂的技能，下载即用。
              </li>
              <li>
                <strong>想分享技能</strong>：把自己打磨过的教学方法写成技能，让更多老师和学生用上。
              </li>
              <li>
                <strong>学校 / 教研组</strong>：把组内沉淀的做法整理发布，统一给大家使用。
              </li>
            </ul>
            <Callout>让每一位老师的好方法，都能被更多课堂复用。</Callout>
          </>
        ),
      },
      {
        id: 'solve',
        title: '我们帮你解决什么',
        body: (
          <>
            <h4 className="font-semibold text-ink">快速找到合适的技能</h4>
            <p>
              技能按「教学、学习、管理、评价、科研」五个场景，和学段、学科分好了类。搜关键词，或在左侧选几个条件，就能找到对口的技能，不用到处翻找。
            </p>
            <h4 className="font-semibold text-ink">拿来就能用</h4>
            <p>每个技能都是一个 zip 包，下载解压后放进 AI 助手的技能目录即可使用。</p>
            <h4 className="font-semibold text-ink">低门槛分享</h4>
            <p>写好一份 SKILL.md、打成 zip 上传，就能发布。不需要会编程。</p>
          </>
        ),
      },
      {
        id: 'which',
        title: '哪些技能会出现在这里',
        body: (
          <Table
            head={['技能状态', '谁能看到']}
            rows={[
              ['公开', '所有人都能搜到、查看、下载'],
              ['私有', '只有作者自己能看到'],
              ['已下架', '其他人搜不到、看不到；作者仍能通过详情页地址访问'],
            ]}
          />
        ),
      },
    ],
  },
  {
    id: 'use',
    title: '找到并使用技能',
    topics: [
      {
        id: 'find',
        title: '搜索与筛选',
        body: (
          <>
            <p>首页的搜索框按技能名称和简介匹配关键词。左侧三组筛选：</p>
            <Table
              head={['分组', '选项']}
              rows={[
                ['场景', '教学、学习、管理、评价、科研'],
                ['学段', '学前、小学、初中、高中、大学'],
                ['学科', '语文、数学、英语、物理、化学、生物、历史、地理、思政、科学、信息科技、艺术、体育'],
              ]}
            />
            <p>
              <strong>每组只能选一个，多组之间要同时满足。</strong>比如选「评价」+「小学」，只列出两个标签都打了的技能——这样结果越选越准，不会越选越多。
            </p>
            <p>排序：「热门」按下载次数，「最新」按发布时间；输入关键词后还可以按「最相关」排。</p>
            <p className="text-ink-muted">刚上传的技能可能要稍等片刻才能被搜到，详情页地址可以立即访问。</p>
          </>
        ),
      },
      {
        id: 'download',
        title: '下载与安装',
        body: (
          <>
            <p>
              在技能详情页点「下载」获取最新版本的 zip 包；「版本信息」里可以下载历史版本。<strong>已下架的版本不能下载。</strong>
            </p>
            <p>解压后把整个文件夹放进你所用 AI 助手的技能目录，AI 助手就能按技能里的方法工作。</p>
          </>
        ),
      },
    ],
  },
  {
    id: 'contribute',
    title: '贡献你的技能',
    topics: [
      {
        id: 'prepare',
        title: '准备 SKILL.md',
        body: (
          <>
            <p>
              技能包的根目录必须有一个 <Code>SKILL.md</Code>。开头用 YAML 写三项信息，正文写给 AI 看的做事方法：
            </p>
            <pre className="overflow-x-auto rounded-control bg-panel p-4 font-mono text-[13px] leading-6">{`---
name: essay-feedback-writer
description: 按内容、结构、语言三个维度给初中议论文写分项评语。用于批改作文时。
version: 1.0.0
---

# 作文分项评语
1. 先通读全文，概括中心论点……`}</pre>
            <Table
              head={['字段', '必填', '说明']}
              rows={[
                [<Code>name</Code>, '是', <>技能名称，同时决定技能地址。<strong>只能用英文</strong>，如 essay-feedback-writer</>],
                [<Code>description</Code>, '是', '一句话说清做什么、什么时候用，会显示在卡片和详情页'],
                [<Code>version</Code>, '否', <>版本号，只能含字母、数字和 <Code>. _ -</Code>；不写就按上传时间自动生成</>],
              ]}
            />
          </>
        ),
      },
      {
        id: 'upload',
        title: '打包上传',
        body: (
          <>
            <Table
              head={['限制', '上限']}
              rows={[
                ['整个 zip', '10 MB'],
                ['包内文件数', '100 个'],
                ['单个文件', '10 MB'],
              ]}
            />
            <p>
              登录后进入 <Link to="/upload" className="link-text">上传技能</Link>，选择 zip、可见性和标签（场景、学段、学科都可多选）。zip
              里多套了一层文件夹也没关系，会自动剥掉。
            </p>
            <p>
              <strong>上传即发布，没有审核环节。</strong>请确认技能里不含学生姓名、成绩等个人信息。
            </p>
          </>
        ),
      },
      {
        id: 'versions',
        title: '版本与可见性',
        body: (
          <Table
            head={['操作', '结果']}
            rows={[
              ['同一个 name 再次上传', '发布新版本，最新版本成为默认下载'],
              ['版本号已经发布过', '上传失败，请改版本号'],
              ['版本号曾被下架', '可以用同一版本号重新上传'],
              ['重新上传时改可见性、标签', '按这次的选择整体更新；标签不选就清空'],
            ]}
          />
        ),
      },
    ],
  },
  {
    id: 'safety',
    title: '安全与下架',
    topics: [
      {
        id: 'checks',
        title: '上传检查',
        body: (
          <>
            <p>上传时平台会自动检查技能包，以下情况会提示告警，需要你确认后才发布：</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>文件类型不在允许范围内（如可执行程序）</li>
              <li>文件内容和扩展名对不上</li>
              <li>疑似包含密码、密钥等敏感信息</li>
            </ul>
          </>
        ),
      },
      {
        id: 'yank',
        title: '下架',
        body: (
          <Table
            head={['', '版本下架', '技能下架']}
            rows={[
              ['入口', '详情页「版本信息」里每个版本的「下架」', '详情页底部「下架技能」'],
              ['效果', '任何人（包括作者）都不能再下载这个版本', '其他人搜不到、看不到、下载不了；作者仍可访问'],
              ['能否撤销', '不能；但可以用同一版本号重新上传', '不能'],
            ]}
          />
        ),
      },
    ],
  },
]

const ALL_IDS = CHAPTERS.flatMap((c) => [c.id, ...c.topics.map((t) => t.id)])

/** 当前读到哪一节：取视口上方最后一个越过的标题 */
function useActiveId() {
  const [active, setActive] = useState(ALL_IDS[1])
  useEffect(() => {
    const onScroll = () => {
      let current = ALL_IDS[1]
      for (const id of ALL_IDS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < 120) current = id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return active
}

/** 左侧目录：一级章节可展开，当前章节默认展开，当前小节高亮（参考 openEuler SkillHub 指南页） */
function Toc({ active }: { active: string }) {
  const activeChapter = CHAPTERS.find((c) => c.id === active || c.topics.some((t) => t.id === active))?.id
  const [open, setOpen] = useState<Record<string, boolean>>({})
  return (
    <nav aria-label="指南目录" className="grid gap-1 text-[15px]">
      {CHAPTERS.map((c) => {
        const expanded = open[c.id] ?? c.id === activeChapter
        return (
          <div key={c.id} className="grid gap-1">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen((o) => ({ ...o, [c.id]: !expanded }))}
              className={cn(
                'focus-ring flex h-10 items-center gap-2 rounded-control px-2 text-left hover:bg-panel',
                c.id === activeChapter ? 'font-semibold text-signal' : 'text-ink',
              )}
            >
              <ChevronDown aria-hidden className={cn('size-4 shrink-0 transition-transform duration-120', !expanded && '-rotate-90')} />
              {c.title}
            </button>
            {expanded &&
              c.topics.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  aria-current={t.id === active ? 'location' : undefined}
                  className={cn(
                    'focus-ring rounded-control border-l-2 py-2 pr-2 pl-8 transition-colors duration-120',
                    t.id === active ? 'border-signal bg-wash font-semibold text-wash-ink' : 'border-transparent text-ink-muted hover:text-ink',
                  )}
                >
                  {t.title}
                </a>
              ))}
          </div>
        )
      })}
    </nav>
  )
}

export function GuidePage() {
  const active = useActiveId()
  const { hash } = useLocation()
  // 从其他页带锚点进来（如贡献页的「查看贡献指南」）时滚到对应章节
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  return (
    <>
      <PageHero title="使用指南" description="了解平台能做什么、怎么找到和使用技能、怎么贡献你的技能" />
      <Container className="flex flex-col gap-8 pt-8 lg:flex-row lg:items-start">
        <aside className="shrink-0 lg:sticky lg:top-24 lg:w-[260px]">
          <Toc active={active} />
        </aside>
        <article className="min-w-0 flex-1 space-y-12 surface-card p-6 sm:p-10">
          {CHAPTERS.map((c) => (
            <section key={c.id} className="space-y-8">
              <h2 id={c.id} className="type-page scroll-mt-24">
                {c.title}
              </h2>
              {c.topics.map((t) => (
                <section key={t.id} className="space-y-3">
                  <h3 id={t.id} className="type-heading scroll-mt-24">
                    {t.title}
                  </h3>
                  <div className="type-body space-y-3 text-ink [&_strong]:font-semibold">{t.body}</div>
                </section>
              ))}
            </section>
          ))}
        </article>
      </Container>
    </>
  )
}
