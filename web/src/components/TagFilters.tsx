import { Chip } from '@/components/ui/chip'
import { SCENES, STAGES, type SceneKey, type StageKey } from '@/lib/tags'

/** 一排单选筛选：「全部」+ 词表项。接口对多个标签取交集（03 §4.2），组内多选会被误解成「或」，所以组内单选 */
function FilterRow<K extends string>({ label, name, options, value, onChange }: {
  label: string
  name: string
  options: readonly { key: K; label: string }[]
  value: K | null
  onChange: (value: K | null) => void
}) {
  const items = [{ key: null, label: '全部' }, ...options]
  return (
    <div className="grid gap-3">
      <p className="eyebrow">{label}</p>
      <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Chip
            key={item.key ?? 'all'}
            role="radio"
            aria-checked={item.key === value}
            selected={item.key === value}
            onClick={() => onChange(item.key)}
          >
            {item.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

export function TagFilters({ scene, stage, onChange }: {
  scene: SceneKey | null
  stage: StageKey | null
  onChange: (patch: { scene?: SceneKey | null; stage?: StageKey | null }) => void
}) {
  return (
    <div className="grid gap-6">
      <FilterRow label="SCENE 场景" name="场景" options={SCENES} value={scene} onChange={(v) => onChange({ scene: v })} />
      <FilterRow label="STAGE 学段" name="学段" options={STAGES} value={stage} onChange={(v) => onChange({ stage: v })} />
    </div>
  )
}
