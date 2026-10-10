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

const schema = z.object({
  file: z
    .custom<File>((v) => v instanceof File, '请选择 zip 文件')
    .refine((f) => f.name.toLowerCase().endsWith('.zip'), '只能上传 .zip 文件'),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
})
type Values = z.infer<typeof schema>

export function UploadPage() {
  const me = useIdentity((s) => s.userId)
  const navigate = useNavigate()
  const upload = useUploadSkill()
  const [warnings, setWarnings] = useState<UploadWarning[] | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { visibility: 'PUBLIC' } })

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
        <PageHeader title="上传技能" />
        <StatusMessage>登录后才能上传技能</StatusMessage>
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="上传技能" description="上传即发布，没有审核环节。" />

      <form className="space-y-6" onSubmit={form.handleSubmit((values) => submit(values, false))}>
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
              />
              <p className="text-xs text-muted-foreground">
                zip 根目录要有 SKILL.md，frontmatter 里写 name 和 description，version 可省略。包内最多 100
                个文件，单个文件不超过 10 MB。
              </p>
              {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>可见性</Label>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                <Label className="font-normal">
                  <RadioGroupItem value="PUBLIC" /> 公开：所有人可搜索、下载
                </Label>
                <Label className="font-normal">
                  <RadioGroupItem value="PRIVATE" /> 私有：仅自己可见
                </Label>
              </RadioGroup>
              {/* 04 §4.1：可见性没有单独的修改入口，靠重传新版本更新 */}
              <p className="text-xs text-muted-foreground">给已有技能传新版本时，可见性会按这里的选择更新。</p>
            </div>
          )}
        />

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <Button type="submit" disabled={upload.isPending}>
          {upload.isPending ? '上传中…' : '上传'}
        </Button>
      </form>

      <AlertDialog open={warnings !== null} onOpenChange={(open) => !open && setWarnings(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>技能包有 {warnings?.length} 条告警</AlertDialogTitle>
            <AlertDialogDescription>确认没问题再继续上传。上传后会立即公开发布（私有则仅自己可见）。</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-1 text-sm">
            {warnings?.map((w, i) => (
              <li key={i}>
                <span className="font-mono">{w.filePath ?? '整个包'}</span>：{w.message}
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
