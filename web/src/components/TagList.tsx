import { Tag } from '@/components/ui/tag'
import { sortTags, tagLabel } from '@/lib/tags'

/** 技能标签的只读展示：灰框小标记，按词表顺序（场景在前） */
export function TagList({ tags, className }: { tags: readonly string[]; className?: string }) {
  if (tags.length === 0) return null
  return (
    <ul aria-label="标签" className={className ?? 'flex flex-wrap gap-1'}>
      {sortTags(tags).map((key) => (
        <li key={key}>
          <Tag variant="muted">{tagLabel(key)}</Tag>
        </li>
      ))}
    </ul>
  )
}
