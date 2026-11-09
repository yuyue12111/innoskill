import { CalendarDays, ChevronRight, CircleUserRound, Tags } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import { useDownloadVersion, useHideSkill, useSkillDetail, useYankVersion } from '@/api/queries'
import type { SkillDetail, SkillVersion } from '@/api/types'
import { useIdentity } from '@/auth/identity'
import { ConfirmAction } from '@/components/ConfirmAction'
import { DownloadIcon } from '@/components/icons/doodle'
import { Container } from '@/components/Page'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { errorText, formatBytes, formatDate } from '@/lib/format'
import { backLabel, backTarget } from '@/lib/paths'
import { tagSummary } from '@/lib/tags'
import { cn } from '@/lib/utils'

/** 与 03 §6.3 下载门禁里版本那三条一致 */
const downloadable = (v: SkillVersion) => v.status === 'PUBLISHED' && v.downloadReady && !v.yankedAt

/** 03 §6.1：没有「下最新版」接口，按确切版本号下载 */
function DownloadButton({ skill, version, primary }: { skill: SkillDetail; version: string; primary?: boolean }) {
  const download = useDownloadVersion()
  return (
    <Button
      variant={primary ? 'default' : 'outline'}
      size={primary ? 'lg' : 'sm'}
      className={cn(primary && 'h-12 w-full text-base')}
      disabled={download.isPending}
      onClick={() =>
        download.mutate(
          { userId: skill.user_id, slug: skill.slug, version },
          { onError: (e) => toast.error(errorText(e)) },
        )
      }
    >
      <DownloadIcon className={primary ? 'size-[22px]' : undefined} />
      {primary ? `下载 ${version}` : '下载'}
    </Button>
  )
}

/** 面包屑：第一级回到进来时的列表，带着原来的筛选（列表卡片把地址放在路由 state 里） */
function Breadcrumb({ current }: { current?: string }) {
  const target = backTarget(useLocation().state)
  return (
    <nav aria-label="面包屑" className="type-body-sm flex min-w-0 items-center gap-1 text-ink-muted">
      <Link to={target} className="focus-ring shrink-0 rounded-control transition-colors duration-120 hover:text-signal">
        {backLabel(target)}
      </Link>
      {current && (
        <>
          <ChevronRight aria-hidden className="size-4 shrink-0" />
          <span aria-current="page" className="truncate text-ink">
            {current}
          </span>
        </>
      )}
    </nav>
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
            <TableCell>
              {/* 用 flex 垂直居中：两个按钮按文字基线排会错开（带图标的那个基线落在图标底部） */}
              <div className="flex items-center justify-end gap-2">
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
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** 右栏：主操作。改版稿的主操作是「添加到 InnoAgent」，等 03 有了对应接口再换 */
function ActionPanel({ skill }: { skill: SkillDetail }) {
  const headline = skill.versions.find((v) => v.isHeadline)
  return (
    <div className="grid w-full max-w-[280px] gap-2">
      {headline && downloadable(headline) ? (
        <>
          <DownloadButton skill={skill} version={headline.version} primary />
          <p className="type-body-sm text-ink-muted tabular-nums">
            zip 包 · {headline.fileCount} 个文件 · {formatBytes(headline.totalSize)}
          </p>
        </>
      ) : (
        <p className="type-body-sm text-ink-muted">暂时没有可下载的版本</p>
      )}
    </div>
  )
}

export function SkillDetailPage() {
  const { userId = '', slug = '' } = useParams()
  const me = useIdentity((s) => s.userId)
  const { data: skill, isPending, isError, error } = useSkillDetail(userId, slug)
  const hide = useHideSkill()

  if (isPending) {
    return (
      <Container className="pt-8">
        <Skeleton className="h-64" />
      </Container>
    )
  }
  if (isError) {
    return (
      <Container className="space-y-6 pt-8">
        <Breadcrumb />
        <StatusMessage>
          {errorText(error, {
            NOT_FOUND: '技能不存在，请检查地址',
            FORBIDDEN: '这个技能是私有的或已下架，只有作者能查看',
          })}
        </StatusMessage>
      </Container>
    )
  }

  const isOwner = me === skill.user_id

  const where = tagSummary(skill.tags)

  return (
    <>
      {/* 页头渐变带：面包屑 + 技能信息卡片（参考 openEuler SkillHub 详情页） */}
      <section className="hero-band">
        <Container className="grid gap-4 pt-6 pb-2">
          <Breadcrumb current={skill.skill_name} />
          <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-6 surface-card p-6 sm:p-8">
            <div className="grid min-w-0 flex-[999_1_520px] gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="type-title text-balance [overflow-wrap:anywhere]">{skill.skill_name}</h1>
                {skill.visibility === 'PRIVATE' && <Tag variant="muted">私有</Tag>}
                {skill.hidden && <Tag variant="danger">已下架</Tag>}
              </div>
              <p className="type-body max-w-[48em] whitespace-pre-line text-ink-muted">{skill.summary}</p>
              <ul className="type-body-sm mt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-ink-muted tabular-nums [&_svg]:size-4 [&_svg]:shrink-0">
                {where && (
                  <li aria-label="标签" className="inline-flex items-center gap-1.5">
                    <Tags aria-hidden />
                    {where}
                  </li>
                )}
                <li className="inline-flex items-center gap-1.5">
                  <CircleUserRound aria-hidden />
                  {skill.user_name}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CalendarDays aria-hidden />
                  发布于 {formatDate(skill.publishedAt)}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <DownloadIcon />
                  <strong className="font-semibold text-signal">{skill.downloadCount}</strong> 次下载
                </li>
                <li>
                  <code className="font-mono [overflow-wrap:anywhere]">
                    {skill.user_id}/{skill.slug}
                  </code>
                </li>
              </ul>
            </div>
            <ActionPanel skill={skill} />
          </div>
        </Container>
      </section>

      <Container className="grid gap-6 pt-6">
        {skill.hidden && (
          <p className="type-body-sm rounded-card bg-danger-wash px-5 py-3.5 text-danger">
            这个技能已下架：其他人搜不到、看不到、下载不了，只有你还能访问。
          </p>
        )}

        {/* 参考站这里是「使用描述 | 版本信息」两个页签；03 详情不返回 SKILL.md 正文，先只放版本信息 */}
        <section aria-labelledby="versions" className="overflow-hidden surface-card [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
          <h2 id="versions" className="type-heading border-b border-line-soft px-6 py-4 tabular-nums">
            版本信息 <span className="type-body font-normal text-ink-muted">· {skill.versions.length} 个版本</span>
          </h2>
          <VersionTable skill={skill} isOwner={isOwner} />
        </section>

        {isOwner && !skill.hidden && (
          <section className="grid justify-items-start gap-3 surface-card p-6">
            <h2 className="type-heading">下架技能</h2>
            <p className="type-body-sm text-ink-muted">
              下架后其他人搜不到、看不到、下载不了这个技能；你自己仍可通过本页地址访问和下载。
            </p>
            {/* 危险按钮只出现在确认弹窗里，页面上的入口用普通按钮 */}
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
      </Container>
    </>
  )
}
