import type { ReactNode } from 'react'
import { useSearchSkills } from '@/api/queries'
import type { SearchParams } from '@/api/types'
import { Pagination } from '@/components/Pagination'
import { SkillCard } from '@/components/SkillCard'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorText } from '@/lib/format'
import { cn } from '@/lib/utils'

/** 搜索结果列表：搜索页与「我的技能」共用 */
export function SkillList({ params, onPageChange, empty }: {
  params: SearchParams
  onPageChange: (page: number) => void
  empty: ReactNode
}) {
  const { data, isPending, isError, error, isPlaceholderData } = useSearchSkills(params)

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    )
  }
  if (isError) return <StatusMessage>{errorText(error)}</StatusMessage>
  if (data.total === 0) return <StatusMessage>{empty}</StatusMessage>

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">共 {data.total} 个技能</p>
      {/* 翻页越界时 items 为空而 total 不为 0（03 §4.1） */}
      {data.items.length === 0 ? (
        <StatusMessage>
          这一页没有内容。
          <Button variant="link" onClick={() => onPageChange(0)}>
            回到第一页
          </Button>
        </StatusMessage>
      ) : (
        <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', isPlaceholderData && 'opacity-60')}>
          {data.items.map((skill) => (
            <SkillCard key={`${skill.user_id}/${skill.slug}`} skill={skill} />
          ))}
        </div>
      )}
      <Pagination page={data.page} size={data.size} total={data.total} onChange={onPageChange} />
    </div>
  )
}
