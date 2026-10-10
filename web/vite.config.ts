import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { configDefaults } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // 关掉 mock 联调本地后端时，把 /api 转给后端（见 README）
      proxy: env.VITE_API_PROXY ? { '/api': env.VITE_API_PROXY } : undefined,
    },
    test: {
      environment: 'jsdom',
      // Node 25+ 自带的 localStorage 会挡住 jsdom 的实现
      execArgv: ['--no-experimental-webstorage'],
      setupFiles: ['./src/test/setup.ts'],
      exclude: [...configDefaults.exclude],
    },
  }
})
