import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 设计系统 Toolbar：panel 底、2px 墨线外框，放排序、每页条数等 */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-2 border-ink bg-panel p-3 sm:p-[18px]">
      {children}
    </div>
  )
}

/** 一组互斥选项：未选中只有灰字，选中黑底白字 */
export function ToolbarOptions<T extends string | number>({ label, options, value, onChange }: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1">
      <span className="type-group mr-2">{label}：</span>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'focus-ring type-label h-[43px] px-3 tabular-nums transition-colors duration-120',
              selected ? 'bg-ink text-on-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
