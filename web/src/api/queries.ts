import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIdentity } from '@/auth/identity'
import { saveBlob } from '@/lib/download'
import {
  downloadVersion,
  getSkill,
  hideSkill,
  searchSkills,
  uploadSkill,
  yankVersion,
} from './skills'
import type { SearchParams } from './types'

// 结果随身份变化（可见性过滤、me 求值），所以 key 里带上当前身份
export const skillKeys = {
  all: ['skills'] as const,
  search: (who: string | null, params: SearchParams) => ['skills', 'search', who, params] as const,
  detail: (who: string | null, userId: string, slug: string) =>
    ['skills', 'detail', who, userId, slug] as const,
}

export function useSearchSkills(params: SearchParams) {
  const who = useIdentity((s) => s.userId)
  return useQuery({
    queryKey: skillKeys.search(who, params),
    queryFn: () => searchSkills(params),
    placeholderData: keepPreviousData,
  })
}

export function useSkillDetail(userId: string, slug: string) {
  const who = useIdentity((s) => s.userId)
  return useQuery({
    queryKey: skillKeys.detail(who, userId, slug),
    queryFn: () => getSkill(userId, slug),
  })
}

function useInvalidateSkills() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: skillKeys.all })
}

export function useUploadSkill() {
  const invalidate = useInvalidateSkills()
  return useMutation({ mutationFn: uploadSkill, onSuccess: invalidate })
}

/** 下载会让下载数 +1（03 §6.5），完成后刷新 */
export function useDownloadVersion() {
  const invalidate = useInvalidateSkills()
  return useMutation({
    mutationFn: (v: { userId: string; slug: string; version: string }) =>
      downloadVersion(v.userId, v.slug, v.version),
    onSuccess: ({ blob, filename }) => {
      saveBlob(blob, filename)
      return invalidate()
    },
  })
}

export function useYankVersion() {
  const invalidate = useInvalidateSkills()
  return useMutation({
    mutationFn: (v: { userId: string; slug: string; version: string }) =>
      yankVersion(v.userId, v.slug, v.version),
    onSuccess: invalidate,
  })
}

export function useHideSkill() {
  const invalidate = useInvalidateSkills()
  return useMutation({
    mutationFn: (v: { userId: string; slug: string }) => hideSkill(v.userId, v.slug),
    onSuccess: invalidate,
  })
}
