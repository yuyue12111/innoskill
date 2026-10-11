import { Button } from '@/components/ui/button'

/** page 从 0 开始（03 §1.6），展示时 +1 */
export function Pagination({ page, size, total, onChange }: {
  page: number
  size: number
  total: number
  onChange: (page: number) => void
}) {
  const pages = Math.ceil(total / size)
  if (pages <= 1) return null
  return (
    <nav aria-label="分页" className="flex items-center justify-center gap-4">
      <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => onChange(page - 1)}>
        上一页
      </Button>
      <span className="type-body-sm text-ink-muted tabular-nums">
        {page + 1} / {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>
        下一页
      </Button>
    </nav>
  )
}
