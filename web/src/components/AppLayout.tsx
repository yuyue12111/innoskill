import { Link, NavLink, Outlet, useLocation } from 'react-router'
import logoUrl from '@/assets/logo.svg'
import { DevIdentitySwitcher } from '@/components/DevIdentitySwitcher'
import { HeaderSearch } from '@/components/HeaderSearch'
import { Container } from '@/components/Page'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: '技能', end: true },
  { to: '/contribute', label: '贡献' },
  { to: '/guide', label: '指南' },
]

export function AppLayout() {
  const { pathname } = useLocation()
  // 详情页归在「技能」下，只做视觉高亮，不设 aria-current
  const onDetail = pathname.startsWith('/skills/')
  return (
    <div className="min-h-svh">
      {/* 吸顶白底导航栏 + 轻阴影；当前页品牌色文字 + 底部 2px 横线（参考 openEuler SkillHub）。层级低于弹窗（z-50） */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper shadow-[0_2px_8px_rgb(43_40_51/0.04)]">
        <Container className="flex min-h-16 flex-wrap items-center gap-x-8 gap-y-2">
          <Link to="/" className="focus-ring flex shrink-0 items-center gap-2 rounded-control text-xl font-extrabold tracking-[-0.01em]">
            <img src={logoUrl} alt="" className="h-[26px] w-auto" />
            InnoSkill
          </Link>
          <nav aria-label="主导航" className="flex shrink-0 gap-6 self-stretch whitespace-nowrap">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'focus-ring relative flex items-center text-[15px] transition-colors duration-120 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full',
                    isActive || (onDetail && to === '/')
                      ? 'font-semibold text-signal after:bg-signal'
                      : 'text-ink hover:text-signal',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          {/* 首页的页头里已有大搜索框，导航栏就不再放 */}
          {pathname !== '/' && <HeaderSearch />}
          <div className="ml-auto flex items-center gap-4 py-2">
            <NavLink
              to="/me"
              className={({ isActive }) =>
                cn('focus-ring rounded-control text-sm hover:text-ink', isActive ? 'font-semibold text-ink' : 'text-ink-muted')
              }
            >
              我的技能
            </NavLink>
            <Button asChild variant="soft" size="sm">
              <Link to="/upload">上传技能</Link>
            </Button>
            <ThemeSwitcher />
            {import.meta.env.DEV && <DevIdentitySwitcher />}
          </div>
        </Container>
      </header>
      <main className="pb-16">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
