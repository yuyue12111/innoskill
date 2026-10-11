import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 外观偏好。system 跟随系统设置；light / dark 写到 <html data-theme>，index.css 据此取色 */
export type ThemePreference = 'system' | 'light' | 'dark'

/** 存储键。index.html 里的内联脚本在首屏前读它，改名要两处一起改 */
export const THEME_STORAGE_KEY = 'innoskill.theme'

interface ThemeState {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
}

export const useTheme = create<ThemeState>()(
  persist((set) => ({ theme: 'system', setTheme: (theme) => set({ theme }) }), { name: THEME_STORAGE_KEY }),
)

function apply(theme: ThemePreference) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
}

apply(useTheme.getState().theme)
useTheme.subscribe((state) => apply(state.theme))
