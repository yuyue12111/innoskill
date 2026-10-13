import { Link, useLocation } from 'react-router'
import type { SkillSummary } from '@/api/types'
import { Tag } from '@/components/ui/tag'
import { skillUrl, type FromState } from '@/lib/paths'
import { tagSummary } from '@/lib/tags'

/** 温柔版 SkillCard：白卡片、1px 浅线、柔和阴影、大圆角，悬停边框加深，整张卡可点。
 * 标签收成一行文字，简介 2 行，底部只留使用量（作者、版本、日期在详情页） */
export function SkillCard({ skill }: { skill: SkillSummary }) {
  const { pathname, search } = useLocation()
  const where = tagSummary(skill.tags)
  return (
    <article className="relative flex min-w-0 flex-col gap-2 surface-card p-5 transition-colors duration-120 hover:border-line-dashed has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-signal">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-lg leading-[26px] font-bold [overflow-wrap:anywhere]">
          {/* 伪元素铺满整张卡片，整卡可点；带上列表地址，详情页的返回链接回到原来的筛选 */}
          <Link
            to={skillUrl(skill.user_id, skill.slug)}
            state={{ from: pathname + search } satisfies FromState}
            className="outline-none after:absolute after:inset-0"
          >
            {skill.skill_name}
          </Link>
        </h3>
        {skill.visibility === 'PRIVATE' && <Tag variant="muted">私有</Tag>}
      </div>
      <p className="mt-0.5 line-clamp-2 text-sm leading-[22px]">{skill.summary}</p>
      <div className="mt-auto grid gap-2">
        {where && <p className="type-body-sm text-ink-muted">{where}</p>}
        {/* 改版稿这里是「N 人在用」+「添加」按钮，等 03 有了对应字段和接口再换 */}
        <p className="type-body-sm border-t border-line-soft pt-3.5 text-ink-muted tabular-nums">{skill.downloadCount} 次下载</p>
      </div>
    </article>
  )
}
