import { Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchSkills } from '@/api/queries'
import type { SortBy } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import { SkillList } from '@/components/SkillList'
import { TagFilters } from '@/components/TagFilters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PAGE_SIZE, useListParams } from '@/lib/searchParams'
import { tagLabel, type TagKey } from '@/lib/tags'

const SORT_LABEL: Record<SortBy, string> = { relevance: '最相关', downloads: '下载最多', newest: '最新发布' }

/** 没有关键词时「最相关」没有意义，不给这个选项；默认值取列表里的第一个 */
const sortOptions = (q: string): SortBy[] => (q ? ['relevance', 'downloads', 'newest'] : ['downloads', 'newest'])

/** [a] →「a」；[a, b] →「a」和「b」；[a, b, c] →「a」、「b」和「c」 */
function quoteAll(parts: string[]): string {
  const quoted = parts.map((p) => `「${p}」`)
  return quoted.length > 1 ? `${quoted.slice(0, -1).join('、')}和${quoted.at(-1)}` : quoted.join('')
}

/** 设计系统 SearchField：输入框与主按钮拼在一起 */
function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(initial)
  return (
    <form
      role="search"
      className="flex max-w-[640px] min-w-0 flex-[1_1_420px]"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(text.trim())
      }}
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="搜索技能名称或简介"
        aria-label="关键词"
        className="h-11 border-r-0 px-4"
      />
      <Button type="submit" className="h-11">
        <Search aria-hidden />
        搜索
      </Button>
    </form>
  )
}

function SortSelect({ options, value, onChange }: { options: SortBy[]; value: SortBy; onChange: (v: SortBy) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="type-group">
        排序：
      </span>
      <select
        aria-label="排序"
        value={value}
        onChange={(e) => onChange(e.target.value as SortBy)}
        className="focus-ring type-label h-9 cursor-pointer border-2 border-ink bg-paper px-2.5 text-ink"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {SORT_LABEL[o]}
          </option>
        ))}
      </select>
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
  const title = q ? `「${q}」` : tags.length > 0 ? tags.map(tagLabel).join(' · ') : '全部技能'
  const conditions = [q, ...tags.map(tagLabel)].filter(Boolean)
  const filtered = conditions.length > 0
  // 排序不算筛选条件，但关键词清掉后「最相关」也就失效了，一起复位
  const clear = () => update({ q: null, scene: null, stage: null, sort: null, page: null })

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        count={query.data?.total}
        countLabel="个匹配的技能"
        extra={
          filtered && (
            <button type="button" className="focus-ring link-quiet ml-2" onClick={clear}>
              清空筛选
            </button>
          )
        }
      />
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
      <div className="pt-2">
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
              <Button variant="outline" onClick={clear}>
                清空筛选
              </Button>
            )
          }
        />
      </div>
    </div>
  )
}
