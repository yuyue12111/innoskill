import { CircleUserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import type { SkillSummary } from '@/api/types'
import { DownloadIcon } from '@/components/icons/doodle'
import { Tag } from '@/components/ui/tag'
import { formatDate } from '@/lib/format'
import type { ListView } from '@/lib/searchParams'
import { skillUrl, type FromState } from '@/lib/paths'
import { TAG_GROUPS } from '@/lib/tags'
import { cn } from '@/lib/utils'

/** 卡片上的标签小方块：场景、学科逐个显示，学段合成一个（「小学、初中」），最多 3 块 */
function TagChips({ tags }: { tags: readonly string[] }) {
  const [scenes, stages, subjects] = TAG_GROUPS.map((g) => g.options.filter((t) => tags.includes(t.key)).map((t) => t.label))
  const chips = [...scenes, ...subjects, ...(stages.length > 0 ? [stages.join('、')] : [])]
  if (chips.length === 0) return null
  const shown = chips.slice(0, 3)
  return (
    <ul aria-label="标签" className="flex flex-wrap gap-1.5">
      {shown.map((c) => (
        <li key={c} className="inline-flex h-6 items-center rounded-tag bg-panel px-2 text-xs text-ink-muted">
          {c}
        </li>
      ))}
      {chips.length > shown.length && <li className="inline-flex h-6 items-center px-1 text-xs text-ink-muted">+{chips.length - shown.length}</li>}
    </ul>
  )
}

function Meta({ skill, className }: { skill: SkillSummary; className?: string }) {
  return (
    <div className={cn('type-body-sm flex items-center justify-between gap-4 text-ink-muted tabular-nums', className)}>
      <span className="inline-flex items-center gap-1" title="下载次数">
        <DownloadIcon className="size-4" />
        {skill.downloadCount}
      </span>
      <span className="inline-flex min-w-0 items-center gap-1">
        <CircleUserRound aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{skill.user_name}</span>
      </span>
    </div>
  )
}

/** 技能卡片（参考 openEuler SkillHub）：名称、两行简介、标签、底部下载数和作者。整张卡可点。
 * list 版是一行：左边名称和简介，右边标签、下载数、作者、发布日期 */
export function SkillCard({ skill, view = 'grid' }: { skill: SkillSummary; view?: ListView }) {
  const { pathname, search } = useLocation()
  const title = (
    <h3 className="min-w-0 text-lg leading-[26px] font-bold [overflow-wrap:anywhere]">
      {/* 伪元素铺满整张卡片，整卡可点；带上列表地址，详情页的面包屑回到原来的筛选 */}
      <Link
        to={skillUrl(skill.user_id, skill.slug)}
        state={{ from: pathname + search } satisfies FromState}
        className="outline-none after:absolute after:inset-0"
      >
        {skill.skill_name}
      </Link>
    </h3>
  )
  const card =
    'relative min-w-0 surface-card transition-[border-color,box-shadow] duration-120 hover:border-wash-line hover:shadow-[0_6px_24px_rgb(88_76_255/0.10)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-signal'

  if (view === 'list') {
    return (
      <article className={cn(card, 'flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4')}>
        <div className="grid min-w-0 flex-[1_1_420px] gap-1">
          <div className="flex items-center gap-2">
            {title}
            {skill.visibility === 'PRIVATE' && <Tag variant="muted">私有</Tag>}
          </div>
          <p className="truncate text-sm leading-[22px] text-ink-muted">{skill.summary}</p>
        </div>
        {/* 定宽，让各行的标签、数字上下对齐 */}
        <div className="w-52 shrink-0">
          <TagChips tags={skill.tags} />
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <Meta skill={skill} className="w-44" />
          <span className="type-body-sm hidden text-ink-muted tabular-nums xl:inline">{formatDate(skill.publishedAt)}</span>
        </div>
      </article>
    )
  }

  return (
    <article className={cn(card, 'flex flex-col gap-3 p-5')}>
      <div className="flex items-start justify-between gap-2">
        {title}
        {skill.visibility === 'PRIVATE' && <Tag variant="muted">私有</Tag>}
      </div>
      <p className="line-clamp-2 min-h-11 text-sm leading-[22px] text-ink-muted">{skill.summary}</p>
      <div className="mt-auto grid gap-3">
        <TagChips tags={skill.tags} />
        {/* 改版稿这里是「N 人在用」+「添加到 InnoAgent」，等 03 有了对应字段和接口再换 */}
        <Meta skill={skill} className="border-t border-line-soft pt-3" />
      </div>
    </article>
  )
}
