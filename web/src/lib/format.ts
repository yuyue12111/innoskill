import { format, parseISO } from 'date-fns'
import { isApiError } from '@/api/client'
import type { ErrorCode } from '@/api/types'

export function formatDate(iso: string | null): string {
  return iso ? format(parseISO(iso), 'yyyy-MM-dd HH:mm') : '—'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 界面上引用用户输入的词（搜索关键词、筛选条件）一律用中文双引号：“批改作业” */
export const quote = (text: string) => `“${text}”`

/** 错误提示文案：03 §1.3 规定 message 是中文、可直接展示；页面需要更具体的说法时按 code 覆盖 */
export function errorText(e: unknown, overrides: Partial<Record<ErrorCode, string>> = {}): string {
  if (!isApiError(e)) return '网络异常，请稍后再试'
  return overrides[e.code] ?? e.message
}
