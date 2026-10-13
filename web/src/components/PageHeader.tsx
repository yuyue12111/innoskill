import type { ReactNode } from 'react'

/** 列表类页面的页头：左侧标题，右侧「数字 + 单位」（数字是唯一用强调色的地方），下方 2px 墨线。每页一个
 * 改版稿压矮了页头（去掉眉标，标题 32px、数字 48px 同行），让首屏能看到卡片 */
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
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-2 border-ink pb-4">
      <div className="min-w-0 space-y-1">
        <h1 className="type-page text-balance [overflow-wrap:anywhere]">{title}</h1>
        {description && <p className="type-body-sm text-ink-muted">{description}</p>}
      </div>
      {countLabel !== undefined && (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <strong className="type-stat">{count ?? '—'}</strong>
          <span className="type-group font-bold">{countLabel}</span>
          {extra}
        </p>
      )}
    </header>
  )
}
