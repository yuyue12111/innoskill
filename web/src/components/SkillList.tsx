import type { ReactNode } from 'react'
import type { useSearchSkills } from '@/api/queries'
import { Pagination } from '@/components/Pagination'
import { SkillCard } from '@/components/SkillCard'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorText } from '@/lib/format'
import type { ListView } from '@/lib/searchParams'
import { cn } from '@/lib/utils'

// 卡片最窄 260px，放得下几列放几列：首页（左侧有筛选栏）桌面 3 列，手机 1 列
const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4'
const LIST = 'grid gap-3'

/** 搜索结果网格：搜索页与「我的技能」共用。查询由页面发起，页头也要用 total */
export function SkillList({ query, view = 'grid', onPageChange, empty, emptyAction }: {
  query: ReturnType<typeof useSearchSkills>
  view?: ListView
  onPageChange: (page: number) => void
  empty: ReactNode
  emptyAction?: ReactNode
}) {
  const { data, isPending, isError, error, isPlaceholderData } = query

  if (isPending) {
    return (
      <div className={GRID}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    )
  }
  if (isError) return <StatusMessage>{errorText(error)}</StatusMessage>
  if (data.total === 0) return <StatusMessage action={emptyAction}>{empty}</StatusMessage>

  return (
    <div className="space-y-8">
      {/* 翻页越界时 items 为空而 total 不为 0（03 §4.1） */}
      {data.items.length === 0 ? (
        <StatusMessage
          action={
            <Button variant="outline" size="sm" onClick={() => onPageChange(0)}>
              回到第一页
            </Button>
          }
        >
          这一页没有内容
        </StatusMessage>
      ) : (
        <div className={cn(view === 'list' ? LIST : GRID, isPlaceholderData && 'opacity-60')}>
          {data.items.map((skill) => (
            <SkillCard key={`${skill.user_id}/${skill.slug}`} skill={skill} view={view} />
          ))}
        </div>
      )}
      <Pagination page={data.page} size={data.size} total={data.total} onChange={onPageChange} />
    </div>
  )
}
