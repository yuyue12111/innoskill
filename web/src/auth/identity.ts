import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 开发期的模拟身份。生产环境身份走 OIDC（06），IdP 未定，暂不接。
 * 本地没有网关，直接带网关本该注入的 X-User-Id（03 §1.2）。
 */
export const DEV_USERS = ['alice', 'bob', 'carol'] as const

interface IdentityState {
  /** null 表示匿名 */
  userId: string | null
  setUserId: (userId: string | null) => void
}

export const useIdentity = create<IdentityState>()(
  persist((set) => ({ userId: null, setUserId: (userId) => set({ userId }) }), {
    name: 'innoskill.dev-identity',
  }),
)

export function identityHeaders(): Record<string, string> {
  const { userId } = useIdentity.getState()
  return userId ? { 'X-User-Id': userId } : {}
}
