import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { isApiError } from '@/api/client'
import { useUploadSkill } from '@/api/queries'
import type { UploadWarning } from '@/api/types'
import { useIdentity } from '@/auth/identity'
import { PageHeader } from '@/components/PageHeader'
import { StatusMessage } from '@/components/StatusMessage'
import { TagPicker } from '@/components/TagPicker'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { errorText } from '@/lib/format'
import { skillUrl } from '@/lib/paths'
import { SCENES, STAGES, type TagKey } from '@/lib/tags'

/**
 * 后端整个请求体上限 10 MB（03 §3.4）。超限时后端会立刻断开连接，浏览器只能看到网络错误、拿不到 400，
 * 所以在前端先拦。请求体里除了 zip 还有分隔符和其它字段，给它们留 4 KB。
 */
const MAX_ZIP_BYTES = 10 * 1024 * 1024 - 4 * 1024

const schema = z.object({
  file: z
    .custom<File>((v) => v instanceof File, '请选择 zip 文件')
    .refine((f) => f.name.toLowerCase().endsWith('.zip'), '只能上传 .zip 文件')
    .refine((f) => f.size <= MAX_ZIP_BYTES, 'zip 文件不能超过 10 MB，请精简后再上传'),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  tags: z.array(z.enum([...SCENES, ...STAGES].map((t) => t.key) as [TagKey, ...TagKey[]])),
})
type Values = z.infer<typeof schema>

export function UploadPage() {
  const me = useIdentity((s) => s.userId)
  const navigate = useNavigate()
  const upload = useUploadSkill()
  const [warnings, setWarnings] = useState<UploadWarning[] | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { visibility: 'PUBLIC', tags: [] } })

  // 03 §3：先不带确认提交；有告警时返回 400 + details.warnings，用户确认后带 confirmWarnings=true 重交
  async function submit(values: Values, confirmWarnings: boolean) {
    setServerError(null)
    try {
      const res = await upload.mutateAsync({ ...values, confirmWarnings })
      // 搜索索引异步重建，刚传完可能搜不到，所以跳详情（03 §3.1）
      toast.success(`已发布 ${res.skill_name} ${res.version}`, {
        description: '搜索结果可能要稍等片刻才会出现',
      })
      navigate(skillUrl(res.user_id, res.slug))
    } catch (e) {
      const found = isApiError(e) ? (e.details.warnings ?? []) : []
      if (!confirmWarnings && found.length > 0) setWarnings(found)
      else setServerError(errorText(e, { UNAUTHORIZED: '请先登录再上传' }))
    }
  }

  if (!me) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="UPLOAD 上传" title="上传技能" />
        <StatusMessage>登录后才能上传技能</StatusMessage>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="UPLOAD 上传" title="上传技能" description="上传即发布，没有审核环节。" />

      <form className="grid max-w-[560px] gap-8" onSubmit={form.handleSubmit((values) => submit(values, false))}>
        <Controller
          control={form.control}
          name="file"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor="file">技能包</Label>
              <Input
                id="file"
                type="file"
                accept=".zip,application/zip"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(e.target.files?.[0])}
                aria-invalid={fieldState.invalid}
                className="h-auto border-dashed p-3"
              />
              <p className="type-body-sm text-ink-muted">
                zip 根目录要有 SKILL.md，frontmatter 里写 name 和 description（name 必须是英文），version 可省略。整个 zip
                不超过 10 MB，包内最多 100 个文件。
              </p>
              {fieldState.error && <p className="type-body-sm text-danger">{fieldState.error.message}</p>}
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>可见性</Label>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-x-6 gap-y-3">
                <Label className="type-body font-normal">
                  <RadioGroupItem value="PUBLIC" /> 公开：所有人可搜索、下载
                </Label>
                <Label className="type-body font-normal">
                  <RadioGroupItem value="PRIVATE" /> 私有：仅自己可见
                </Label>
              </RadioGroup>
              {/* 04 §4.1：可见性没有单独的修改入口，靠重传新版本更新 */}
              <p className="type-body-sm text-ink-muted">给已有技能传新版本时，可见性会按这里的选择更新。</p>
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="tags"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>标签</Label>
              <TagPicker value={field.value} onChange={field.onChange} />
              {/* 03 §3.2：每次上传整体覆盖 */}
              <p className="type-body-sm text-ink-muted">
                可多选，也可以不选。给已有技能传新版本时，标签按这次的选择整体更新，不选就清空。
              </p>
            </div>
          )}
        />

        {serverError && (
          <p role="alert" className="type-body-sm border border-danger bg-danger-wash px-4 py-3">
            {serverError}
          </p>
        )}

        <Button type="submit" className="justify-self-start" disabled={upload.isPending}>
          {upload.isPending ? '上传中…' : '上传'}
        </Button>
      </form>

      <AlertDialog open={warnings !== null} onOpenChange={(open) => !open && setWarnings(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>技能包有 {warnings?.length} 条告警</AlertDialogTitle>
            <AlertDialogDescription>确认没问题再继续上传。上传后会立即公开发布（私有则仅自己可见）。</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="type-body-sm grid gap-1 border-y border-line py-3">
            {warnings?.map((w, i) => (
              <li key={i}>
                <code className="font-mono">{w.filePath ?? '整个包'}</code>：{w.message}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setWarnings(null)
                void form.handleSubmit((values) => submit(values, true))()
              }}
            >
              仍然上传
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
