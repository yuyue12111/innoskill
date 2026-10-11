import { Download } from 'lucide-react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { useDownloadVersion, useHideSkill, useSkillDetail, useYankVersion } from '@/api/queries'
import type { SkillDetail, SkillVersion } from '@/api/types'
import { useIdentity } from '@/auth/identity'
import { ConfirmAction } from '@/components/ConfirmAction'
import { PageHeader } from '@/components/PageHeader'
import { StatusMessage } from '@/components/StatusMessage'
import { TagList } from '@/components/TagList'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { errorText, formatBytes, formatDate } from '@/lib/format'
import { isScene, isStage } from '@/lib/tags'
import { cn } from '@/lib/utils'

/** 与 03 §6.3 下载门禁里版本那三条一致 */
const downloadable = (v: SkillVersion) => v.status === 'PUBLISHED' && v.downloadReady && !v.yankedAt

/** 03 §6.1：没有「下最新版」接口，按确切版本号下载 */
function DownloadButton({ skill, version, label }: { skill: SkillDetail; version: string; label?: string }) {
  const download = useDownloadVersion()
  return (
    <Button
      variant={label ? 'default' : 'outline'}
      size={label ? 'default' : 'sm'}
      disabled={download.isPending}
      onClick={() =>
        download.mutate(
          { userId: skill.user_id, slug: skill.slug, version },
          { onError: (e) => toast.error(errorText(e)) },
        )
      }
    >
      <Download />
      {label ?? '下载'}
    </Button>
  )
}

function VersionTable({ skill, isOwner }: { skill: SkillDetail; isOwner: boolean }) {
  const yank = useYankVersion()
  // 03 未规定 versions[] 的顺序，按发布时间倒序展示
  const versions = [...skill.versions].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>版本</TableHead>
          <TableHead>状态</TableHead>
          <TableHead className="hidden sm:table-cell">文件</TableHead>
          <TableHead className="hidden sm:table-cell">发布时间</TableHead>
          <TableHead>
            <span className="sr-only">操作</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map((v) => (
          <TableRow key={v.version} className={cn(v.yankedAt && 'text-ink-muted')}>
            <TableCell>
              <span className="inline-flex items-center gap-2">
                {v.version}
                {v.isHeadline && <Tag>最新</Tag>}
              </span>
            </TableCell>
            <TableCell>{v.yankedAt ? `已下架 · ${formatDate(v.yankedAt)}` : '已发布'}</TableCell>
            <TableCell className="hidden sm:table-cell">
              {v.fileCount} 个 · {formatBytes(v.totalSize)}
            </TableCell>
            <TableCell className="hidden sm:table-cell">{formatDate(v.publishedAt)}</TableCell>
            <TableCell className="space-x-2 text-right">
              {downloadable(v) && <DownloadButton skill={skill} version={v.version} />}
              {isOwner && downloadable(v) && (
                <ConfirmAction
                  trigger={
                    <Button variant="ghost" size="sm">
                      下架
                    </Button>
                  }
                  title={`下架版本 ${v.version}？`}
                  description="下架后任何人（包括你）都不能再下载这个版本，操作不可撤销。之后可以用同一版本号重新上传。"
                  confirmLabel="下架版本"
                  onConfirm={() =>
                    yank
                      .mutateAsync({ userId: skill.user_id, slug: skill.slug, version: v.version })
                      .then(() => toast.success(`已下架版本 ${v.version}`))
                  }
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** 标签按 03 §1.7 的两组分行显示；某组没打标签就不显示那一行 */
function SkillTags({ tags }: { tags: readonly string[] }) {
  const groups = [
    { label: '场景', tags: tags.filter(isScene) },
    { label: '学段', tags: tags.filter(isStage) },
  ].filter((g) => g.tags.length > 0)
  if (groups.length === 0) return null
  return (
    <dl className="grid gap-2">
      {groups.map((g) => (
        <div key={g.label} className="flex flex-wrap items-center gap-2">
          <dt className="type-group">{g.label}：</dt>
          <dd>
            <TagList tags={g.tags} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function SkillDetailPage() {
  const { userId = '', slug = '' } = useParams()
  const me = useIdentity((s) => s.userId)
  const { data: skill, isPending, isError, error } = useSkillDetail(userId, slug)
  const hide = useHideSkill()

  if (isPending) return <Skeleton className="h-64" />
  if (isError) {
    return (
      <StatusMessage>
        {errorText(error, {
          NOT_FOUND: '技能不存在，请检查地址',
          FORBIDDEN: '这个技能是私有的或已下架，只有作者能查看',
        })}
      </StatusMessage>
    )
  }

  const isOwner = me === skill.user_id
  const headline = skill.versions.find((v) => v.isHeadline)

  return (
    <div className="space-y-12 sm:space-y-[72px]">
      <PageHeader
        variant="title"
        eyebrow="SKILL 技能"
        title={skill.skill_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <code className="font-mono">
              {skill.user_id}/{skill.slug}
            </code>
            {skill.visibility === 'PRIVATE' && <Tag variant="muted">私有</Tag>}
            {skill.hidden && <Tag variant="danger">已下架</Tag>}
          </span>
        }
        count={skill.downloadCount}
        countLabel="DOWNLOADS 下载"
      />

      <section className="grid gap-6">
        <p className="type-body max-w-[65ch] whitespace-pre-line">{skill.summary}</p>
        <p className="type-body-sm text-ink-muted tabular-nums">
          作者 {skill.user_name} · 发布于 {formatDate(skill.publishedAt)}
        </p>
        <SkillTags tags={skill.tags} />
        {headline && downloadable(headline) && (
          <div>
            <DownloadButton skill={skill} version={headline.version} label={`下载 ${headline.version}`} />
          </div>
        )}
        {skill.hidden && (
          <p className="type-body-sm border border-danger bg-danger-wash px-4 py-3">
            这个技能已下架：其他人搜不到、看不到、下载不了，只有你还能访问。
          </p>
        )}
      </section>

      <section className="grid gap-4">
        <p className="eyebrow">VERSIONS 版本</p>
        <VersionTable skill={skill} isOwner={isOwner} />
      </section>

      {isOwner && !skill.hidden && (
        <section className="grid justify-items-start gap-3 border border-line bg-paper p-6">
          <h2 className="type-heading">下架技能</h2>
          <p className="type-body-sm text-ink-muted">
            下架后其他人搜不到、看不到、下载不了这个技能；你自己仍可通过本页地址访问和下载。
          </p>
          {/* 设计系统：危险按钮只出现在确认弹窗里，页面上的入口用普通按钮 */}
          <ConfirmAction
            trigger={<Button variant="outline">下架技能</Button>}
            title={`下架 ${skill.skill_name}？`}
            description="操作不可撤销，平台没有恢复入口。下架后连你的「我的技能」列表里也不再显示。"
            confirmLabel="下架技能"
            onConfirm={() =>
              hide.mutateAsync({ userId: skill.user_id, slug: skill.slug }).then(() => toast.success('技能已下架'))
            }
          />
        </section>
      )}
    </div>
  )
}
