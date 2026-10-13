import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useSearchSkills } from '@/api/queries'
import type { SortBy } from '@/api/types'
import { SearchIcon } from '@/components/icons/doodle'
import { PageHeader } from '@/components/PageHeader'
import { SkillList } from '@/components/SkillList'
import { TagFilters } from '@/components/TagFilters'
import { Button } from '@/components/ui/button'
import { quote } from '@/lib/format'
import { PAGE_SIZE, useListParams } from '@/lib/searchParams'
import { tagLabel, type TagKey } from '@/lib/tags'

const SORT_LABEL: Record<SortBy, string> = { relevance: '最相关', downloads: '下载最多', newest: '最新发布' }

/** 没有关键词时「最相关」没有意义，不给这个选项；默认值取列表里的第一个 */
const sortOptions = (q: string): SortBy[] => (q ? ['relevance', 'downloads', 'newest'] : ['downloads', 'newest'])

/** [a] → “a”；[a, b] → “a”和“b”；[a, b, c] → “a”、“b”和“c” */
function quoteAll(parts: string[]): string {
  const quoted = parts.map(quote)
  return quoted.length > 1 ? `${quoted.slice(0, -1).join('、')}和${quoted.at(-1)}` : quoted.join('')
}

/** 温柔版 SearchField：48px 胶囊框，左边放大镜，右边内嵌主按钮；焦点框套在整个胶囊上 */
function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(initial)
  return (
    <form
      role="search"
      className="flex h-12 max-w-[640px] min-w-0 flex-[1_1_420px] items-center gap-2 rounded-control border border-field bg-paper pr-1 pl-3.5 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-signal"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(text.trim())
      }}
    >
      <SearchIcon className="size-[22px] text-ink-muted" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="搜索技能名称或简介"
        aria-label="关键词"
        className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-muted"
      />
      <Button type="submit">搜索</Button>
    </form>
  )
}

function SortSelect({ options, value, onChange }: { options: SortBy[]; value: SortBy; onChange: (v: SortBy) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="type-group">
        排序
      </span>
      {/* 原生下拉框：去掉系统外观，换成胶囊框 + 自己的箭头 */}
      <div className="relative">
        <select
          aria-label="排序"
          value={value}
          onChange={(e) => onChange(e.target.value as SortBy)}
          className="focus-ring h-10 cursor-pointer appearance-none rounded-control border border-field bg-paper pr-9 pl-4 text-[15px] font-medium text-ink"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {SORT_LABEL[o]}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" />
      </div>
    </div>
  )
}

export function SearchPage() {
  const { q, sort, page, scene, stage, update } = useListParams()
  const tags = [scene, stage].filter((t): t is TagKey => t !== null)
  const options = sortOptions(q)
  const effectiveSort = sort && options.includes(sort) ? sort : options[0]
  const query = useSearchSkills({ q: q || undefined, tags, sort: effectiveSort, page, size: PAGE_SIZE })

  // 页头标题就是用户此刻所在的位置：关键词 > 标签 > 全部
  const title = q ? quote(q) : tags.length > 0 ? tags.map(tagLabel).join(' · ') : '全部技能'
  const conditions = [q, ...tags.map(tagLabel)].filter(Boolean)
  const filtered = conditions.length > 0
  // 排序不算筛选条件，但关键词清掉后「最相关」也就失效了，一起复位
  const clear = () => update({ q: null, scene: null, stage: null, sort: null, page: null })

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        count={query.data?.total}
        countLabel="个匹配的技能"
        extra={
          filtered && (
            <button type="button" className="focus-ring link-text ml-2 rounded-control" onClick={clear}>
              清空筛选
            </button>
          )
        }
      />
      {/* 温柔版：搜索、排序、筛选收在一张卡片里 */}
      <section aria-label="搜索与筛选" className="grid gap-4 surface-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {/* key 让 URL 变化（如后退）时输入框跟着重置；新关键词按它自己的默认排序 */}
          <SearchBox key={q} initial={q} onSearch={(value) => update({ q: value, sort: null, page: null })} />
          <SortSelect
            options={options}
            value={effectiveSort}
            onChange={(v) => update({ sort: v === options[0] ? null : v, page: null })}
          />
        </div>
        <TagFilters scene={scene} stage={stage} onChange={(patch) => update({ ...patch, page: null })} />
      </section>
      <div className="pt-1">
        <SkillList
          query={query}
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
    </div>
  )
}
