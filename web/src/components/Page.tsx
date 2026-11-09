import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 页面内容的统一宽度和左右边距。导航栏、页头渐变带、正文都对齐到这一列 */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-[1280px] px-4 sm:px-6', className)}>{children}</div>
}

/** 页头渐变带：铺满整行，内容对齐 Container。首页居中，其他页左对齐（参考 openEuler SkillHub） */
export function PageHero({ title, description, center, children }: {
  title: ReactNode
  description?: ReactNode
  center?: boolean
  /** 标题下面的内容：首页的统计和搜索框、列表页的计数 */
  children?: ReactNode
}) {
  return (
    <section className="hero-band border-b border-line-soft">
      <Container className={cn('grid gap-3 py-10 sm:py-12', center && 'justify-items-center text-center sm:py-14')}>
        <h1 className={cn('text-balance [overflow-wrap:anywhere]', center ? 'type-hero' : 'type-title')}>{title}</h1>
        {description && <p className="type-body max-w-[48em] text-ink-muted sm:text-base">{description}</p>}
        {children}
      </Container>
    </section>
  )
}
