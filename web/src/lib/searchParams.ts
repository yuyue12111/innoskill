import { useSearchParams } from 'react-router'
import type { SortBy } from '@/api/types'

export const PAGE_SIZE = 12
const SORTS: SortBy[] = ['newest', 'downloads', 'relevance']

/** 列表页的查询条件放在 URL 里，可分享、可后退。手改 URL 的脏值退回默认 */
export function useListParams() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page'))
  const sort = params.get('sort') as SortBy

  return {
    q: params.get('q') ?? '',
    sort: SORTS.includes(sort) ? sort : 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 0,
    /** 改条件；值为 null 时删掉该项 */
    update(patch: Record<string, string | number | null>) {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === '' || value === 0) next.delete(key)
          else next.set(key, String(value))
        }
        return next
      })
    },
  }
}
