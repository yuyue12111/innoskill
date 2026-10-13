import { Chip } from '@/components/ui/chip'
import { SCENES, STAGES, type SceneKey, type StageKey } from '@/lib/tags'

/** 一行单选筛选：组名 +「全部」+ 词表项。接口对多个标签取交集（03 §4.2），组内多选会被误解成「或」，所以组内单选 */
function FilterRow<K extends string>({ name, options, value, onChange }: {
  name: string
  options: readonly { key: K; label: string }[]
  value: K | null
  onChange: (value: K | null) => void
}) {
  const items = [{ key: null, label: '全部' }, ...options]
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap items-center gap-2">
      <span aria-hidden className="type-group w-16 shrink-0">
        {name}：
      </span>
      {items.map((item) => (
        <Chip
          key={item.key ?? 'all'}
          size="sm"
          role="radio"
          aria-checked={item.key === value}
          selected={item.key === value}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </Chip>
      ))}
    </div>
  )
}

export function TagFilters({ scene, stage, onChange }: {
  scene: SceneKey | null
  stage: StageKey | null
  onChange: (patch: { scene?: SceneKey | null; stage?: StageKey | null }) => void
}) {
  return (
    <div className="grid gap-2">
      <FilterRow name="场景" options={SCENES} value={scene} onChange={(v) => onChange({ scene: v })} />
      <FilterRow name="学段" options={STAGES} value={stage} onChange={(v) => onChange({ stage: v })} />
    </div>
  )
}
