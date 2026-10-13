import { Link, useLocation } from 'react-router'
import type { SkillSummary } from '@/api/types'
import { Tag } from '@/components/ui/tag'
import { skillUrl, type FromState } from '@/lib/paths'
import { tagSummary } from '@/lib/tags'

/** 设计系统 SkillCard：1px 细线，悬停变 2px 墨线框，整张卡可点。
 * 有意不用参考站的粗框分栏卡片：一屏成片出现，全用粗框太重。
 * 改版稿：标签收成一行文字，简介 2 行，底部只留使用量（作者、版本、日期在详情页） */
export function SkillCard({ skill }: { skill: SkillSummary }) {
  const { pathname, search } = useLocation()
  const where = tagSummary(skill.tags)
  return (
    <article className="relative flex min-w-0 flex-col gap-2 border border-line bg-paper p-4 transition-colors duration-120 hover:border-ink hover:shadow-[inset_0_0_0_1px_var(--ink)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ink">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-lg leading-6 font-bold tracking-[-0.01em] [overflow-wrap:anywhere]">
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
      <p className="type-body-sm line-clamp-2">{skill.summary}</p>
      <div className="mt-auto grid gap-2">
        {where && <p className="type-body-sm text-ink-muted">{where}</p>}
        {/* 改版稿这里是「N 人在用」+「添加」按钮，等 03 有了对应字段和接口再换 */}
        <p className="type-body-sm border-t border-line pt-3 text-ink-muted tabular-nums">{skill.downloadCount} 次下载</p>
      </div>
    </article>
  )
}
