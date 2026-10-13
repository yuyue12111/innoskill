import { Link, NavLink, Outlet, useLocation } from 'react-router'
import logoUrl from '@/assets/logo.svg'
import { DevIdentitySwitcher } from '@/components/DevIdentitySwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: '全部技能', end: true },
  { to: '/me', label: '我的技能' },
]

export function AppLayout() {
  // 详情页归在「全部技能」下（改版稿），只做视觉高亮，不设 aria-current
  const onDetail = useLocation().pathname.startsWith('/skills/')
  return (
    <div className="min-h-svh">
      <header className="border-b-2 border-ink">
        <div className="mx-auto flex min-h-16 max-w-[1168px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/" className="focus-ring flex shrink-0 items-center gap-2 text-lg font-black tracking-[-0.01em]">
            <img src={logoUrl} alt="" className="h-6 w-auto" />
            InnoSkill
          </Link>
          {/* 当前页反色，与筛选标签的选中态一致 */}
          <nav aria-label="主导航" className="flex shrink-0 gap-1 whitespace-nowrap">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'focus-ring px-3 py-1.5 text-[15px] leading-6 font-bold tracking-[0.06em] transition-colors duration-120',
                    isActive || (onDetail && to === '/') ? 'bg-ink text-on-ink' : 'text-ink hover:bg-panel',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            {/* 上传是作者的事，大多数人来找技能，所以降成次要链接 */}
            <NavLink
              to="/upload"
              className={({ isActive }) =>
                cn('focus-ring type-body-sm hover:text-ink', isActive ? 'font-bold text-ink' : 'text-ink-muted')
              }
            >
              上传技能
            </NavLink>
            <ThemeSwitcher />
            {import.meta.env.DEV && <DevIdentitySwitcher />}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1168px] px-4 pt-6 pb-16 sm:px-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
