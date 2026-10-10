import type { ReactNode } from 'react'

/** 空态 / 错误 / 需要登录等整块提示 */
export function StatusMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
