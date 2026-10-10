import { useState } from 'react'
import type { SortBy } from '@/api/types'
import { SkillList } from '@/components/SkillList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAGE_SIZE, useListParams } from '@/lib/searchParams'

const SORT_LABEL: Record<SortBy, string> = {
  newest: '最新发布',
  downloads: '下载最多',
  relevance: '最相关',
}

function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(initial)
  return (
    <form
      role="search"
      className="flex min-w-64 flex-1 gap-2"
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
      />
      <Button type="submit">搜索</Button>
    </form>
  )
}

export function SearchPage() {
  const { q, sort, page, update } = useListParams()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {/* key 让 URL 变化（如后退）时输入框跟着重置 */}
        <SearchBox key={q} initial={q} onSearch={(value) => update({ q: value, page: null })} />
        <Select value={sort} onValueChange={(value) => update({ sort: value === 'newest' ? null : value, page: null })}>
          <SelectTrigger className="w-32" aria-label="排序">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SkillList
        params={{ q: q || undefined, sort, page, size: PAGE_SIZE }}
        onPageChange={(p) => update({ page: p })}
        empty={q ? `没有找到和「${q}」相关的技能` : '还没有技能'}
      />
    </div>
  )
}
