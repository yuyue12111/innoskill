import { Link, NavLink, Outlet } from 'react-router'
import logoUrl from '@/assets/logo.svg'
import { DevIdentitySwitcher } from '@/components/DevIdentitySwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: '发现', end: true },
  { to: '/me', label: '我的技能' },
  { to: '/upload', label: '上传' },
]

export function AppLayout() {
  return (
    <div className="min-h-svh">
      <header className="border-b-2 border-ink">
        <div className="mx-auto flex min-h-16 max-w-[1120px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/" className="focus-ring flex shrink-0 items-center gap-2 text-lg font-black tracking-[-0.02em]">
            <img src={logoUrl} alt="" className="h-6 w-auto" />
            InnoSkill
          </Link>
          <nav className="flex shrink-0 gap-6 whitespace-nowrap">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'focus-ring text-[15px] leading-5 font-bold border-b-2 py-1 transition-colors duration-120',
                    isActive ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <ThemeSwitcher />
            {import.meta.env.DEV && <DevIdentitySwitcher />}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
