// 03 §1.7 标签词表。接口里只传 key，中文名由前端按本表显示
export const SCENES = [
  { key: 'teaching', label: '教学' },
  { key: 'learning', label: '学习' },
  { key: 'management', label: '管理' },
  { key: 'assessment', label: '评价' },
  { key: 'research', label: '科研' },
] as const

export const STAGES = [
  { key: 'preschool', label: '学前' },
  { key: 'primary', label: '小学' },
  { key: 'junior', label: '初中' },
  { key: 'senior', label: '高中' },
  { key: 'university', label: '大学' },
] as const

export type SceneKey = (typeof SCENES)[number]['key']
export type StageKey = (typeof STAGES)[number]['key']
export type TagKey = SceneKey | StageKey

const ALL = [...SCENES, ...STAGES]
const LABEL = new Map<string, string>(ALL.map((t) => [t.key, t.label]))

export const isScene = (key: string): key is SceneKey => SCENES.some((t) => t.key === key)
export const isStage = (key: string): key is StageKey => STAGES.some((t) => t.key === key)

/** 中文名；词表外的值原样显示（接口不该返回，但不让界面崩） */
export const tagLabel = (key: string) => LABEL.get(key) ?? key

/** 一行文字概括标签，如「评价、教学 · 小学、初中」：组内按词表顺序，场景在前；没打标签的组不出现 */
export function tagSummary(keys: readonly string[]): string {
  return [SCENES, STAGES]
    .map((group) => group.filter((t) => keys.includes(t.key)).map((t) => t.label).join('、'))
    .filter(Boolean)
    .join(' · ')
}
