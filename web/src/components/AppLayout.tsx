import { Link, NavLink, Outlet } from 'react-router'
import { DevIdentitySwitcher } from '@/components/DevIdentitySwitcher'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: '发现', end: true },
  { to: '/me', label: '我的技能' },
  { to: '/upload', label: '上传' },
]

export function AppLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:gap-x-6">
          <Link to="/" className="shrink-0 font-semibold">
            InnoSkill
          </Link>
          <nav className="flex shrink-0 gap-4 text-sm whitespace-nowrap">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn('text-muted-foreground hover:text-foreground', isActive && 'font-medium text-foreground')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">{import.meta.env.DEV && <DevIdentitySwitcher />}</div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
