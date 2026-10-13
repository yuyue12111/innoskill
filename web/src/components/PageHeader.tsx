import type { ReactNode } from 'react'

/** 列表类页面的页头：左侧标题，右侧「数字 + 单位」（数字用品牌色）。每页一个
 * 页头压矮（标题 30px、数字 40px 同行），让 1366×768 笔记本首屏能看到卡片 */
export function PageHeader({ title, description, count, countLabel, extra }: {
  title: ReactNode
  description?: ReactNode
  /** 数字；undefined 时显示占位 */
  count?: number | null
  /** 不给就不显示数字 */
  countLabel?: string
  /** 跟在数字后面的次要操作，如「清空筛选」 */
  extra?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0 space-y-1">
        <h1 className="type-page text-balance [overflow-wrap:anywhere]">{title}</h1>
        {description && <p className="type-body-sm text-ink-muted">{description}</p>}
      </div>
      {countLabel !== undefined && (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <strong className="type-stat">{count ?? '—'}</strong>
          <span className="text-sm text-ink-muted">{countLabel}</span>
          {extra}
        </p>
      )}
    </header>
  )
}
