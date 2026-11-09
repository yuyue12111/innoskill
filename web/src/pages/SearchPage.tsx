import { LayoutGrid, List } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useSearchSkills } from '@/api/queries'
import type { SortBy } from '@/api/types'
import { SearchIcon } from '@/components/icons/doodle'
import { Container, PageHero } from '@/components/Page'
import { SkillList } from '@/components/SkillList'
import { TagFilters } from '@/components/TagFilters'
import { Button } from '@/components/ui/button'
import { quote } from '@/lib/format'
import { PAGE_SIZE, useListParams, type ListView } from '@/lib/searchParams'
import { STAGES, SUBJECTS, tagLabel, type TagKey } from '@/lib/tags'
import { cn } from '@/lib/utils'

const SORT_LABEL: Record<SortBy, string> = { relevance: '最相关', downloads: '热门', newest: '最新' }

/** 没有关键词时「最相关」没有意义，不给这个选项；默认值取列表里的第一个 */
const sortOptions = (q: string): SortBy[] => (q ? ['relevance', 'downloads', 'newest'] : ['downloads', 'newest'])

/** [a] → “a”；[a, b] → “a”和“b”；[a, b, c] → “a”、“b”和“c” */
function quoteAll(parts: string[]): string {
  const quoted = parts.map(quote)
  return quoted.length > 1 ? `${quoted.slice(0, -1).join('、')}和${quoted.at(-1)}` : quoted.join('')
}

/** 页头大搜索框：48px 白底方框，左边放大镜，回车搜索 */
function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(initial)
  return (
    <form
      role="search"
      className="mt-4 flex h-12 w-full max-w-[720px] items-center gap-2 rounded-control border border-line-strong bg-paper pr-1 pl-4 shadow-card has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-signal"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(text.trim())
      }}
    >
      <SearchIcon className="size-[22px] text-ink-muted" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="搜索技能：输入关键词，如“作文批改”“错题整理”“评分量规”"
        aria-label="关键词"
        className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-muted"
      />
      <Button type="submit">搜索</Button>
    </form>
  )
}

/** 页头统计：技能总数来自接口，学段、学科是词表大小 */
function Stats({ total }: { total: number | undefined }) {
  const items = [
    { value: total ?? '—', label: '个技能' },
    { value: STAGES.length, label: '个学段' },
    { value: SUBJECTS.length, label: '个学科' },
  ]
  return (
    <dl className="flex flex-wrap justify-center divide-x divide-line-strong">
      {items.map((s) => (
        <div key={s.label} className="flex items-baseline gap-1.5 px-6 sm:px-10">
          <dt className="sr-only">{s.label}</dt>
          <dd className="type-stat">{s.value}</dd>
          <dd className="text-sm text-ink-muted">{s.label}</dd>
        </div>
      ))}
    </dl>
  )
}

/** 分段控件：浅灰底槽，选中项白底品牌色字（参考 openEuler SkillHub 的「热门 / 最新」） */
function Segmented<T extends string>({ label, options, value, onChange, iconOnly }: {
  label: string
  options: { value: T; label: string; icon?: ReactNode }[]
  value: T
  onChange: (v: T) => void
  iconOnly?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-0.5 rounded-control bg-panel p-1">
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={iconOnly ? o.label : undefined}
            title={iconOnly ? o.label : undefined}
            onClick={() => onChange(o.value)}
            className={cn(
              'focus-ring inline-flex h-8 items-center justify-center rounded-[calc(var(--radius-control)-2px)] text-[15px] transition-colors duration-120',
              iconOnly ? 'w-9 [&_svg]:size-[18px]' : 'px-4',
              selected ? 'bg-paper font-semibold text-signal shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
          >
            {iconOnly ? o.icon : o.label}
          </button>
        )
      })}
    </div>
  )
}

export function SearchPage() {
  const { q, sort, page, scene, stage, subject, view, update } = useListParams()
  const tags = [scene, stage, subject].filter((t): t is TagKey => t !== null)
  const options = sortOptions(q)
  const effectiveSort = sort && options.includes(sort) ? sort : options[0]
  const query = useSearchSkills({ q: q || undefined, tags, sort: effectiveSort, page, size: PAGE_SIZE })
  // 页头的技能总数：不带任何条件的总数，和下面的筛选结果分开查
  const all = useSearchSkills({ size: 1 })

  const conditions = [q, ...tags.map(tagLabel)].filter(Boolean)
  const filtered = conditions.length > 0
  // 排序不算筛选条件，但关键词清掉后「最相关」也就失效了，一起复位；视图保留
  const clear = () => update({ q: null, scene: null, stage: null, subject: null, sort: null, page: null })

  return (
    <>
      <PageHero
        center
        title="发现、使用和分享教育 AI 技能"
        description="为老师、学生和学校管理者汇聚可复用的 AI 技能，覆盖教学、学习、管理、评价、科研"
      >
        <Stats total={all.data?.total} />
        {/* key 让 URL 变化（如后退）时输入框跟着重置；新关键词按它自己的默认排序 */}
        <SearchBox key={q} initial={q} onSearch={(value) => update({ q: value, sort: null, page: null })} />
      </PageHero>

      <Container className="flex flex-col gap-8 pt-8 lg:flex-row">
        <aside aria-label="筛选" className="shrink-0 lg:w-[220px]">
          <TagFilters value={{ scene, stage, subject }} onChange={(patch) => update({ ...patch, page: null })} />
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Segmented
              label="排序"
              options={options.map((o) => ({ value: o, label: SORT_LABEL[o] }))}
              value={effectiveSort}
              onChange={(v) => update({ sort: v === options[0] ? null : v, page: null })}
            />
            <p className="type-body-sm flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted">
              {filtered && <span className="text-ink">{conditions.map((c, i) => (i === 0 && q ? quote(c) : c)).join(' · ')}</span>}
              <span className="tabular-nums">共 {query.data?.total ?? '—'} 个技能</span>
              {filtered && (
                <button type="button" className="focus-ring link-text rounded-control" onClick={clear}>
                  清空筛选
                </button>
              )}
            </p>
            <div className="ml-auto">
              <Segmented<ListView>
                label="视图"
                iconOnly
                options={[
                  { value: 'grid', label: '卡片视图', icon: <LayoutGrid aria-hidden /> },
                  { value: 'list', label: '列表视图', icon: <List aria-hidden /> },
                ]}
                value={view}
                onChange={(v) => update({ view: v })}
              />
            </div>
          </div>

          <SkillList
            query={query}
            view={view}
            onPageChange={(p) => update({ page: p })}
            empty={
              conditions.length === 0
                ? '还没有技能'
                : conditions.length === 1
                  ? `没有符合${quoteAll(conditions)}的技能`
                  : `没有同时符合${quoteAll(conditions)}的技能`
            }
            emptyAction={
              filtered && (
                <Button variant="soft" className="h-11 px-5" onClick={clear}>
                  清空筛选
                </Button>
              )
            }
          />
        </div>
      </Container>
    </>
  )
}
