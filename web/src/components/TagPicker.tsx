import { Chip } from '@/components/ui/chip'
import { TAG_GROUPS, type TagKey } from '@/lib/tags'

/** 上传时打标签：场景、学段、学科三组，都可多选、可不选（03 §1.7；学科组待后端加） */
export function TagPicker({ value, onChange }: { value: TagKey[]; onChange: (value: TagKey[]) => void }) {
  const toggle = (key: TagKey) =>
    onChange(value.includes(key) ? value.filter((t) => t !== key) : [...value, key])

  return (
    <div className="grid gap-4">
      {TAG_GROUPS.map((group) => (
        <div key={group.name} role="group" aria-label={group.name} className="flex flex-wrap items-center gap-2">
          <span className="type-group w-12 shrink-0">{group.name}</span>
          {group.options.map((t) => (
            <Chip key={t.key} aria-pressed={value.includes(t.key)} selected={value.includes(t.key)} onClick={() => toggle(t.key)}>
              {t.label}
            </Chip>
          ))}
        </div>
      ))}
    </div>
  )
}
