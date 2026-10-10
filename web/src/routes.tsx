import type { RouteObject } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { MySkillsPage } from '@/pages/MySkillsPage'
import { NotFoundPage, RouteError } from '@/pages/NotFoundPage'
import { SearchPage } from '@/pages/SearchPage'
import { SkillDetailPage } from '@/pages/SkillDetailPage'
import { UploadPage } from '@/pages/UploadPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <SearchPage /> },
      { path: 'me', element: <MySkillsPage /> },
      { path: 'upload', element: <UploadPage /> },
      // 详情页地址与 03 的资源路径一一对应：/api/skills/{user_id}/{slug}
      { path: 'skills/:userId/:slug', element: <SkillDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
