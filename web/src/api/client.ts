import { identityHeaders } from '@/auth/identity'
import type { ErrorBody, ErrorCode } from './types'

/** 非 2xx 响应（03 §1.3）。按项目约定不写 class：interface + 工厂函数。 */
export interface ApiError extends Error {
  kind: 'api'
  status: number
  code: ErrorCode
  details: NonNullable<ErrorBody['error']['details']>
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof Error && (e as Partial<ApiError>).kind === 'api'
}

function createApiError(status: number, body: Partial<ErrorBody> | null): ApiError {
  const err = body?.error
  return Object.assign(new Error(err?.message ?? `请求失败（HTTP ${status}）`), {
    name: 'ApiError',
    kind: 'api' as const,
    status,
    code: err?.code ?? 'INTERNAL',
    details: err?.details ?? {},
  })
}

type Init = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }

/** 所有请求的出口：补 /api 前缀与身份头，非 2xx 转成 ApiError。 */
export async function apiFetch(path: string, init: Init = {}): Promise<Response> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { ...identityHeaders(), ...init.headers },
  })
  if (!res.ok) throw createApiError(res.status, await res.json().catch(() => null))
  return res
}

export async function apiJson<T>(path: string, init?: Init): Promise<T> {
  return (await apiFetch(path, init)).json() as Promise<T>
}
