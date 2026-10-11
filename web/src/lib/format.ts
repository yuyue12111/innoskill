import { format, parseISO } from 'date-fns'
import { isApiError } from '@/api/client'
import type { ErrorCode } from '@/api/types'

export function formatDate(iso: string | null): string {
  return iso ? format(parseISO(iso), 'yyyy-MM-dd HH:mm') : '—'
}

export function formatDay(iso: string | null): string {
  return iso ? format(parseISO(iso), 'yyyy-MM-dd') : ''
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  UNAUTHORIZED: '请先登录',
  FORBIDDEN: '没有权限',
  RATE_LIMITED: '操作太频繁，请稍后再试',
  INTERNAL: '服务出错了，请稍后再试',
}

/** 错误提示文案：按 code 给通用中文，BAD_REQUEST / NOT_FOUND 用服务端 message（03 §1.3 说可直接展示） */
export function errorText(e: unknown, overrides: Partial<Record<ErrorCode, string>> = {}): string {
  if (!isApiError(e)) return '网络异常，请稍后再试'
  return overrides[e.code] ?? ERROR_TEXT[e.code] ?? e.message
}
