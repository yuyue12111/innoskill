import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { SearchIcon } from '@/components/icons/doodle'

/** 导航栏里的全站搜索：回车跳到列表页搜关键词。
 * 在列表页时保留当前的场景、学段筛选，和页内搜索框行为一致；排序、页码复位 */
export function HeaderSearch() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const onList = pathname === '/'
  const q = onList ? (params.get('q') ?? '') : ''

  function search(text: string) {
    const next = new URLSearchParams(onList ? params : undefined)
    next.delete('sort')
    next.delete('page')
    if (text) next.set('q', text)
    else next.delete('q')
    const query = next.toString()
    navigate(query ? `/?${query}` : '/')
  }

  // key：URL 里的关键词变了（页内搜索、后退、离开列表页）就让输入框跟着重置
  return <SearchForm key={q} initial={q} onSearch={search} />
}

function SearchForm({ initial, onSearch }: { initial: string; onSearch: (text: string) => void }) {
  const [text, setText] = useState(initial)
  return (
    <form
      role="search"
      aria-label="全站搜索"
      className="flex h-10 max-w-[360px] min-w-0 flex-[1_1_220px] items-center gap-2 rounded-control border border-field bg-paper px-3.5 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-signal"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(text.trim())
      }}
    >
      <SearchIcon className="text-ink-muted" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="搜索技能…"
        aria-label="搜索技能"
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
      />
    </form>
  )
}
