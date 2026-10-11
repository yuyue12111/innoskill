import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: '跟随系统', Icon: Monitor },
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'dark', label: '深色', Icon: Moon },
]

/** 外观切换：设计系统的分段控件（相邻方格、2px 外框，选中黑底） */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  return (
    <div role="radiogroup" aria-label="外观" className="inline-flex border-2 border-ink">
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'focus-ring grid size-8 place-items-center transition-colors duration-120 [&_svg]:size-4',
              selected ? 'bg-ink text-on-ink' : 'bg-paper text-ink-muted hover:text-ink',
            )}
          >
            <Icon aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
