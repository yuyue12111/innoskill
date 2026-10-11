import { useSearchParams } from 'react-router'
import type { SortBy } from '@/api/types'
import { isScene, isStage } from '@/lib/tags'

const SORTS: SortBy[] = ['newest', 'downloads', 'relevance']
export const PAGE_SIZES = [12, 24, 48] as const
const DEFAULT_SIZE = PAGE_SIZES[0]

/** 列表页的查询条件放在 URL 里，可分享、可后退。手改 URL 的脏值退回默认 */
export function useListParams() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page'))
  const size = Number(params.get('size'))
  const sort = params.get('sort') as SortBy
  const scene = params.get('scene') ?? ''
  const stage = params.get('stage') ?? ''

  return {
    q: params.get('q') ?? '',
    sort: SORTS.includes(sort) ? sort : 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 0,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_SIZE,
    scene: isScene(scene) ? scene : null,
    stage: isStage(stage) ? stage : null,
    /** 改条件；值为 null、空串或默认值时从 URL 删掉该项 */
    update(patch: Record<string, string | number | null>) {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          const isDefault = (key === 'page' && value === 0) || (key === 'size' && value === DEFAULT_SIZE)
          if (value === null || value === '' || isDefault) next.delete(key)
          else next.set(key, String(value))
        }
        return next
      })
    },
  }
}
