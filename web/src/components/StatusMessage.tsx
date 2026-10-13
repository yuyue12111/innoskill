import type { ReactNode } from 'react'

/** EmptyState：空态、无权限、出错时占据列表位置的整块提示，白底虚线圆角框 */
export function StatusMessage({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-4 rounded-card border border-dashed border-line-dashed bg-paper px-6 py-12 text-center">
      <p className="type-body text-ink-muted">{children}</p>
      {action}
    </div>
  )
}
