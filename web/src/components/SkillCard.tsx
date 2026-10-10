import { Link } from 'react-router'
import type { SkillSummary } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/format'
import { skillUrl } from '@/lib/paths'

export function SkillCard({ skill }: { skill: SkillSummary }) {
  return (
    <Card className="relative h-full transition-colors hover:bg-muted/40">
      <CardHeader>
        <CardTitle className="flex items-start gap-2">
          {/* 伪元素铺满整张卡片，整卡可点 */}
          <Link to={skillUrl(skill.user_id, skill.slug)} className="break-all after:absolute after:inset-0">
            {skill.skill_name}
          </Link>
          {skill.visibility === 'PRIVATE' && <Badge variant="secondary">私有</Badge>}
        </CardTitle>
        <CardDescription className="line-clamp-3">{skill.summary}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{skill.user_name}</span>
        {skill.headlineVersion && <span>{skill.headlineVersion}</span>}
        <span>{skill.downloadCount} 次下载</span>
        <span>{formatDate(skill.publishedAt)}</span>
      </CardFooter>
    </Card>
  )
}
