import { useSearchParams } from 'react-router'
import type { SortBy } from '@/api/types'
import { isScene, isStage } from '@/lib/tags'

const SORTS: SortBy[] = ['newest', 'downloads', 'relevance']
/** 固定每页条数：卡片网格桌面 4 列 × 3 行 */
export const PAGE_SIZE = 12

/** 列表页的查询条件放在 URL 里，可分享、可后退。手改 URL 的脏值退回默认 */
export function useListParams() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page'))
  const sort = params.get('sort') as SortBy
  const scene = params.get('scene') ?? ''
  const stage = params.get('stage') ?? ''

  return {
    q: params.get('q') ?? '',
    /** null 表示没指定，默认值由页面按有无关键词决定 */
    sort: SORTS.includes(sort) ? sort : null,
    page: Number.isInteger(page) && page > 0 ? page : 0,
    scene: isScene(scene) ? scene : null,
    stage: isStage(stage) ? stage : null,
    /** 改条件；值为 null、空串或默认值时从 URL 删掉该项 */
    update(patch: Record<string, string | number | null>) {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === '' || (key === 'page' && value === 0)) next.delete(key)
          else next.set(key, String(value))
        }
        return next
      })
    },
  }
}
