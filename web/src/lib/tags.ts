// 03 §1.7 标签词表。接口里只传 key，中文名由前端按本表显示
// 学科组是前端先行：03 还没有，后端加之前选学科会被 400（见 docs/前端改版-后端待办.md）
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

export const SUBJECTS = [
  { key: 'chinese', label: '语文' },
  { key: 'math', label: '数学' },
  { key: 'english', label: '英语' },
  { key: 'physics', label: '物理' },
  { key: 'chemistry', label: '化学' },
  { key: 'biology', label: '生物' },
  { key: 'history', label: '历史' },
  { key: 'geography', label: '地理' },
  { key: 'politics', label: '思政' },
  { key: 'science', label: '科学' },
  { key: 'it', label: '信息科技' },
  { key: 'arts', label: '艺术' },
  { key: 'pe', label: '体育' },
] as const

export type SceneKey = (typeof SCENES)[number]['key']
export type StageKey = (typeof STAGES)[number]['key']
export type SubjectKey = (typeof SUBJECTS)[number]['key']
export type TagKey = SceneKey | StageKey | SubjectKey

/** 三组的显示顺序：场景（教学管评研）→ 学段 → 学科 */
export const TAG_GROUPS = [
  { name: '场景', param: 'scene', options: SCENES },
  { name: '学段', param: 'stage', options: STAGES },
  { name: '学科', param: 'subject', options: SUBJECTS },
] as const

export const ALL_TAGS: readonly { key: TagKey; label: string }[] = [...SCENES, ...STAGES, ...SUBJECTS]
const LABEL = new Map<string, string>(ALL_TAGS.map((t) => [t.key, t.label]))

export const isScene = (key: string): key is SceneKey => SCENES.some((t) => t.key === key)
export const isStage = (key: string): key is StageKey => STAGES.some((t) => t.key === key)
export const isSubject = (key: string): key is SubjectKey => SUBJECTS.some((t) => t.key === key)

/** 中文名；词表外的值原样显示（接口不该返回，但不让界面崩） */
export const tagLabel = (key: string) => LABEL.get(key) ?? key

/** 一行文字概括标签，如「评价、教学 · 小学、初中 · 数学」：组内按词表顺序；没打标签的组不出现 */
export function tagSummary(keys: readonly string[]): string {
  return TAG_GROUPS.map((g) => g.options.filter((t) => keys.includes(t.key)).map((t) => t.label).join('、'))
    .filter(Boolean)
    .join(' · ')
}
