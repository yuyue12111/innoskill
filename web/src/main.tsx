import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { createQueryClient } from '@/api/queryClient'
import { routes } from '@/routes'
import './index.css'

/** 开发期默认走 MSW mock；联调真后端时设 VITE_API_MOCK=false（见 README） */
async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCK === 'false') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

const router = createBrowserRouter(routes)
const queryClient = createQueryClient()

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
})
