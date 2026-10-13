import { Link, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import { useDownloadVersion, useHideSkill, useSkillDetail, useYankVersion } from '@/api/queries'
import type { SkillDetail, SkillVersion } from '@/api/types'
import { useIdentity } from '@/auth/identity'
import { ConfirmAction } from '@/components/ConfirmAction'
import { ArrowLeftIcon, DownloadIcon } from '@/components/icons/doodle'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { errorText, formatBytes, formatDate } from '@/lib/format'
import { backLabel, backTarget } from '@/lib/paths'
import { isScene, isStage, tagLabel } from '@/lib/tags'
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
      className={cn(primary && 'h-[52px] w-full text-base')}
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

/** 回到进来时的列表，带着原来的筛选（列表卡片把地址放在路由 state 里） */
function BackLink() {
  const target = backTarget(useLocation().state)
  return (
    <Link
      to={target}
      className="focus-ring inline-flex items-center gap-1.5 rounded-control text-sm text-ink-muted transition-colors duration-120 hover:text-ink"
    >
      <ArrowLeftIcon />
      {backLabel(target)}
    </Link>
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

/** 标签：每个场景一个淡底胶囊，学段合成一个灰字胶囊（「小学、初中、高中」）；没打标签就不显示 */
function SkillTags({ tags }: { tags: readonly string[] }) {
  const scenes = tags.filter(isScene).map(tagLabel)
  const stages = tags.filter(isStage).map(tagLabel)
  if (scenes.length + stages.length === 0) return null
  const pill = 'inline-flex h-[26px] items-center rounded-tag bg-panel px-2.5 text-[13px] leading-[18px]'
  return (
    <ul aria-label="标签" className="flex flex-wrap gap-1.5">
      {scenes.map((s) => (
        <li key={s} className={pill}>
          {s}
        </li>
      ))}
      {stages.length > 0 && <li className={cn(pill, 'text-ink-muted')}>{stages.join('、')}</li>}
    </ul>
  )
}

/** 右栏：核心数字 + 主操作。改版稿的主操作是「添加到 InnoAgent」、数字是「人在用」，等 03 有了对应接口再换 */
function ActionPanel({ skill }: { skill: SkillDetail }) {
  const headline = skill.versions.find((v) => v.isHeadline)
  return (
    <div className="grid max-w-[340px] min-w-0 flex-[1_1_280px] gap-3">
      <p className="flex items-baseline gap-2">
        <strong className="type-stat-lg">{skill.downloadCount}</strong>
        <span className="type-body text-ink-muted">次下载</span>
      </p>
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

  if (isPending) return <Skeleton className="h-64" />
  if (isError) {
    return (
      <div className="space-y-6">
        <BackLink />
        <StatusMessage>
          {errorText(error, {
            NOT_FOUND: '技能不存在，请检查地址',
            FORBIDDEN: '这个技能是私有的或已下架，只有作者能查看',
          })}
        </StatusMessage>
      </div>
    )
  }

  const isOwner = me === skill.user_id

  return (
    <div className="space-y-6">
      <BackLink />

      {/* 温柔版：头部是一张卡片，左栏技能信息，右栏核心数字和主操作 */}
      <section className="flex flex-wrap items-end justify-between gap-x-12 gap-y-8 surface-card p-6 sm:p-8">
        <div className="grid min-w-0 flex-[999_1_520px] gap-3">
          <SkillTags tags={skill.tags} />
          <h1 className="type-title text-balance [overflow-wrap:anywhere]">{skill.skill_name}</h1>
          <p className="type-body-sm flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted tabular-nums">
            <code className="font-mono [overflow-wrap:anywhere]">
              {skill.user_id}/{skill.slug}
            </code>
            <span>· 作者 {skill.user_name}</span>
            <span>· 发布于 {formatDate(skill.publishedAt)}</span>
            {skill.visibility === 'PRIVATE' && <Tag variant="muted">私有</Tag>}
            {skill.hidden && <Tag variant="danger">已下架</Tag>}
          </p>
          <p className="type-lead mt-1 max-w-[36em] whitespace-pre-line">{skill.summary}</p>
        </div>
        <ActionPanel skill={skill} />
      </section>

      <div className="grid max-w-[760px] gap-10 pt-4">
        {skill.hidden && (
          <p className="type-body-sm rounded-2xl bg-danger-wash px-5 py-3.5 text-danger">
            这个技能已下架：其他人搜不到、看不到、下载不了，只有你还能访问。
          </p>
        )}

        {/* 改版稿：版本表是给作者和老用户看的，默认收起 */}
        <details className="overflow-hidden surface-card">
          <summary className="focus-ring type-body cursor-pointer rounded-card px-5 py-3.5 font-semibold tabular-nums">
            版本记录 · {skill.versions.length} 个版本
          </summary>
          <div className="border-t border-line-soft">
            <VersionTable skill={skill} isOwner={isOwner} />
          </div>
        </details>

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
      </div>
    </div>
  )
}
