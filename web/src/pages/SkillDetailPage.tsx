import { Download } from 'lucide-react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { useDownloadVersion, useHideSkill, useSkillDetail, useYankVersion } from '@/api/queries'
import type { SkillDetail, SkillVersion } from '@/api/types'
import { useIdentity } from '@/auth/identity'
import { ConfirmAction } from '@/components/ConfirmAction'
import { StatusMessage } from '@/components/StatusMessage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorText, formatBytes, formatDate } from '@/lib/format'

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
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map((v) => (
          <TableRow key={v.version}>
            <TableCell className="font-mono">
              {v.version} {v.isHeadline && <Badge variant="outline">最新</Badge>}
            </TableCell>
            <TableCell>
              {v.yankedAt ? (
                <span className="text-muted-foreground">已下架 · {formatDate(v.yankedAt)}</span>
              ) : (
                '已发布'
              )}
            </TableCell>
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
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold break-all">{skill.skill_name}</h1>
            {skill.visibility === 'PRIVATE' && <Badge variant="secondary">私有</Badge>}
            {skill.hidden && <Badge variant="destructive">已下架</Badge>}
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            {skill.user_id}/{skill.slug}
          </p>
        </div>
        <p className="whitespace-pre-line">{skill.summary}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>作者 {skill.user_name}</span>
          <span>{skill.downloadCount} 次下载</span>
          <span>发布于 {formatDate(skill.publishedAt)}</span>
        </div>
        {headline && downloadable(headline) && (
          <DownloadButton skill={skill} version={headline.version} label={`下载 ${headline.version}`} />
        )}
        {skill.hidden && (
          <p className="text-sm text-muted-foreground">这个技能已下架：其他人搜不到、看不到、下载不了，只有你还能访问。</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">版本</h2>
        <VersionTable skill={skill} isOwner={isOwner} />
      </section>

      {isOwner && !skill.hidden && (
        <section className="space-y-3 rounded-lg border border-destructive/30 p-4">
          <h2 className="font-medium">下架技能</h2>
          <p className="text-sm text-muted-foreground">
            下架后其他人搜不到、看不到、下载不了这个技能；你自己仍可通过本页地址访问和下载。
          </p>
          <ConfirmAction
            trigger={<Button variant="destructive">下架技能</Button>}
            title={`下架 ${skill.skill_name}？`}
            description="操作不可撤销，平台没有恢复入口。下架后连你的「我的技能」列表里也不再显示。"
            confirmLabel="下架技能"
            onConfirm={() =>
              hide
                .mutateAsync({ userId: skill.user_id, slug: skill.slug })
                .then(() => toast.success('技能已下架'))
            }
          />
        </section>
      )}
    </div>
  )
}
