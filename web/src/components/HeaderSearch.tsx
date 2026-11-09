import { useState } from 'react'
import { useNavigate } from 'react-router'
import { SearchIcon } from '@/components/icons/doodle'

/** 导航栏里的全站搜索（首页以外的页面才有）：回车跳到首页按关键词搜 */
export function HeaderSearch() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  return (
    <form
      role="search"
      aria-label="全站搜索"
      className="flex h-9 max-w-[320px] min-w-0 flex-[1_1_200px] items-center gap-2 rounded-control border border-line-strong bg-paper px-3 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-signal"
      onSubmit={(e) => {
        e.preventDefault()
        const q = text.trim()
        navigate(q ? `/?${new URLSearchParams({ q })}` : '/')
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
