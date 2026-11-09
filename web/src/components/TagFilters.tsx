import { TAG_GROUPS, type SceneKey, type StageKey, type SubjectKey } from '@/lib/tags'
import { cn } from '@/lib/utils'

export interface TagSelection {
  scene: SceneKey | null
  stage: StageKey | null
  subject: SubjectKey | null
}

/** 一组单选：组名 +「全部」+ 词表项。接口对多个标签取交集（03 §4.2），组内多选会被误解成「或」，所以组内单选 */
function FilterGroup<K extends string>({ name, options, value, columns, onChange }: {
  name: string
  options: readonly { key: K; label: string }[]
  value: K | null
  columns?: boolean
  onChange: (value: K | null) => void
}) {
  const items = [{ key: null, label: '全部' }, ...options]
  return (
    <div className="grid gap-2">
      <h2 className="type-group px-1">{name}</h2>
      {/* 宽屏竖排成侧栏（学科项多，排两列）；窄屏横排换行 */}
      <div role="radiogroup" aria-label={name} className={cn('flex flex-wrap gap-1 lg:grid', columns && 'lg:grid-cols-2')}>
        {items.map((item) => {
          const selected = item.key === value
          return (
            <button
              key={item.key ?? 'all'}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(item.key)}
              className={cn(
                'focus-ring flex h-9 items-center gap-2.5 rounded-control px-3 text-left text-[15px] transition-colors duration-120',
                selected ? 'bg-wash font-semibold text-wash-ink' : 'text-ink hover:bg-panel',
              )}
            >
              {/* 单选圆点：选中是品牌色实心环 */}
              <span
                aria-hidden
                className={cn(
                  'size-4 shrink-0 rounded-full border',
                  selected ? 'border-[5px] border-signal bg-paper' : 'border-line-dashed bg-paper',
                )}
              />
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** 首页左侧筛选栏：场景（教学管评研）、学段、学科三组 */
export function TagFilters({ value, onChange }: {
  value: TagSelection
  onChange: (patch: Partial<TagSelection>) => void
}) {
  const [scene, stage, subject] = TAG_GROUPS
  return (
    <div className="grid gap-6">
      <FilterGroup name={scene.name} options={scene.options} value={value.scene} onChange={(v) => onChange({ scene: v })} />
      <FilterGroup name={stage.name} options={stage.options} value={value.stage} onChange={(v) => onChange({ stage: v })} />
      <FilterGroup
        name={subject.name}
        options={subject.options}
        value={value.subject}
        columns
        onChange={(v) => onChange({ subject: v })}
      />
    </div>
  )
}
