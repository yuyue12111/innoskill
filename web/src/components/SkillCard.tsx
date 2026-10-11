import { Link } from 'react-router'
import type { SkillSummary } from '@/api/types'
import { TagList } from '@/components/TagList'
import { Tag } from '@/components/ui/tag'
import { formatDay } from '@/lib/format'
import { skillUrl } from '@/lib/paths'

/** 设计系统 SkillCard：1px 细线，悬停变 2px 墨线框，整张卡可点。
 * 有意不用参考站的粗框分栏卡片：一屏成片出现，全用粗框太重 */
export function SkillCard({ skill }: { skill: SkillSummary }) {
  const meta = [skill.user_name, skill.headlineVersion, `${skill.downloadCount} 次下载`, formatDay(skill.publishedAt)]
  return (
    <article className="relative flex min-w-0 flex-col gap-3 border border-line bg-paper p-4 transition-colors duration-120 hover:border-ink hover:shadow-[inset_0_0_0_1px_var(--ink)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ink">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg leading-6 font-bold tracking-[-0.02em] [overflow-wrap:anywhere]">
          {/* 伪元素铺满整张卡片，整卡可点 */}
          <Link to={skillUrl(skill.user_id, skill.slug)} className="outline-none after:absolute after:inset-0">
            {skill.skill_name}
          </Link>
        </h3>
        {skill.visibility === 'PRIVATE' && <Tag variant="muted">私有</Tag>}
      </div>
      <p className="type-body-sm line-clamp-3">{skill.summary}</p>
      <TagList tags={skill.tags} />
      <p className="type-body-sm mt-auto border-t border-line pt-3 text-ink-muted tabular-nums">
        {meta.filter(Boolean).join(' · ')}
      </p>
    </article>
  )
}
