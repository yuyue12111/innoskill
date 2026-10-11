import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 设计系统 PageHeader：眉标 + 主标题 + 右侧计数（唯一用强调色的地方），下方 2px 墨线。每页一个 */
export function PageHeader({ eyebrow, title, description, count, countLabel, action, variant = 'display' }: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  /** 右侧大号数字；undefined 时显示占位 */
  count?: number | null
  countLabel?: string
  action?: ReactNode
  /** display 用于列表页；title 用于详情页的技能名（通常是长英文） */
  variant?: 'display' | 'title'
}) {
  const showCount = countLabel !== undefined
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink pb-7">
      <div className="min-w-0 space-y-3">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className={cn('text-balance [overflow-wrap:anywhere]', variant === 'display' ? 'type-display' : 'type-title')}>
          {title}
        </h1>
        {description && <div className="type-body-sm text-ink-muted">{description}</div>}
      </div>
      {(showCount || action) && (
        <div className="flex items-end gap-6">
          {action}
          {showCount && (
            <div className="sm:text-right">
              <strong className="type-stat block">{count ?? '—'}</strong>
              <p className="eyebrow mt-2">{countLabel}</p>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
