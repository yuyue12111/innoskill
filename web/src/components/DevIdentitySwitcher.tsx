import { DEV_USERS, useIdentity } from '@/auth/identity'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ANONYMOUS = 'anonymous'

/** 开发期切换模拟身份。接入 OIDC 后由登录取代 */
export function DevIdentitySwitcher() {
  const { userId, setUserId } = useIdentity()
  // 联调时可能用列表外的身份（如 fe-demo），也要显示出来
  const users: readonly string[] = userId && !(DEV_USERS as readonly string[]).includes(userId) ? [...DEV_USERS, userId] : DEV_USERS
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted-foreground sm:inline">开发身份</span>
      <Select value={userId ?? ANONYMOUS} onValueChange={(v) => setUserId(v === ANONYMOUS ? null : v)}>
        <SelectTrigger size="sm" className="w-24 rounded-control px-3" aria-label="开发身份">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANONYMOUS}>匿名</SelectItem>
          {users.map((u) => (
            <SelectItem key={u} value={u}>
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
