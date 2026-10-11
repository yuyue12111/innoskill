import { useState } from 'react'
import { useSearchSkills } from '@/api/queries'
import type { SortBy } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import { SkillList } from '@/components/SkillList'
import { TagFilters } from '@/components/TagFilters'
import { Toolbar, ToolbarOptions } from '@/components/Toolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PAGE_SIZES, useListParams } from '@/lib/searchParams'
import { tagLabel, type TagKey } from '@/lib/tags'

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: '最新发布' },
  { value: 'downloads', label: '下载最多' },
  { value: 'relevance', label: '最相关' },
]
const SIZE_OPTIONS = PAGE_SIZES.map((n) => ({ value: n, label: String(n) }))

/** 设计系统 SearchField：48px 输入框与主按钮拼在一起 */
function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(initial)
  return (
    <form
      role="search"
      className="flex max-w-[640px]"
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
        className="h-12 border-r-0"
      />
      <Button type="submit" size="lg">
        搜索
      </Button>
    </form>
  )
}

export function SearchPage() {
  const { q, sort, page, size, scene, stage, update } = useListParams()
  const tags = [scene, stage].filter((t): t is TagKey => t !== null)
  const query = useSearchSkills({ q: q || undefined, tags, sort, page, size })
  const filtered = q !== '' || tags.length > 0

  // 页头标题就是用户此刻所在的位置：关键词 > 标签 > 全部
  const [eyebrow, title] = q
    ? ['SEARCH 搜索', `「${q}」`]
    : tags.length > 0
      ? ['FILTER 筛选', tags.map(tagLabel).join(' · ')]
      : ['SKILLS 技能', '全部技能']

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={eyebrow} title={title} count={query.data?.total} countLabel="匹配的 SKILLS" />
      {/* key 让 URL 变化（如后退）时输入框跟着重置 */}
      <SearchBox key={q} initial={q} onSearch={(value) => update({ q: value, page: null })} />
      <TagFilters scene={scene} stage={stage} onChange={(patch) => update({ ...patch, page: null })} />
      <Toolbar>
        <ToolbarOptions
          label="排序"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(v) => update({ sort: v === 'newest' ? null : v, page: null })}
        />
        <ToolbarOptions label="每页" options={SIZE_OPTIONS} value={size} onChange={(v) => update({ size: v, page: null })} />
      </Toolbar>
      <SkillList
        query={query}
        onPageChange={(p) => update({ page: p })}
        empty={filtered ? '没有符合条件的技能' : '还没有技能'}
        emptyAction={
          filtered && (
            <Button variant="outline" size="sm" onClick={() => update({ q: null, scene: null, stage: null, page: null })}>
              清除筛选
            </Button>
          )
        }
      />
    </div>
  )
}
