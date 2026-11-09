import { quote } from '@/lib/format'
import { isScene, isStage, isSubject, tagLabel } from '@/lib/tags'

export const skillUrl = (userId: string, slug: string) =>
  `/skills/${encodeURIComponent(userId)}/${encodeURIComponent(slug)}`

/** 从列表进详情时，卡片把列表地址放进路由 state（{ from }），详情页的返回链接回到原来的筛选 */
export interface FromState {
  from: string
}

/** 只认站内路径；直接打开详情页（没有 state）时回全部技能 */
export function backTarget(state: unknown): string {
  const from = (state as Partial<FromState> | null)?.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'
}

/** 面包屑第一级的文字带上筛选条件，如「全部技能（评价 · 初中）」 */
export function backLabel(target: string): string {
  const url = new URL(target, 'http://local')
  if (url.pathname === '/me') return '我的技能'
  const get = (key: string) => url.searchParams.get(key) ?? ''
  const [q, scene, stage, subject] = [get('q'), get('scene'), get('stage'), get('subject')]
  const parts = [
    q && quote(q),
    isScene(scene) && tagLabel(scene),
    isStage(stage) && tagLabel(stage),
    isSubject(subject) && tagLabel(subject),
  ].filter(Boolean)
  return parts.length > 0 ? `全部技能（${parts.join(' · ')}）` : '全部技能'
}
