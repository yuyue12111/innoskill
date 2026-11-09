import type { ReactNode } from 'react'
import { PageHero } from '@/components/Page'

/** 二级页面（我的技能、上传）的页头：渐变带里左侧标题，下面一行「数字 + 单位」（数字用品牌色） */
export function PageHeader({ title, description, count, countLabel }: {
  title: ReactNode
  description?: ReactNode
  /** 数字；undefined 时显示占位 */
  count?: number | null
  /** 不给就不显示数字 */
  countLabel?: string
}) {
  return (
    <PageHero title={title} description={description}>
      {countLabel !== undefined && (
        <p className="flex items-baseline gap-2">
          <strong className="type-stat">{count ?? '—'}</strong>
          <span className="text-sm text-ink-muted">{countLabel}</span>
        </p>
      )}
    </PageHero>
  )
}
