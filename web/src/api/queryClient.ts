import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './client'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 4xx 是确定的结果（无权、不存在、参数错），重试没有意义
        retry: (count, error) => !(isApiError(error) && error.status < 500) && count < 2,
      },
    },
  })
}
