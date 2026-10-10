// 接口文档 03 的数据结构。字段名与 03 逐字一致（03 里蛇形、驼峰混用，随 03 一起改）。

export type Visibility = 'PUBLIC' | 'PRIVATE'
export type SortBy = 'newest' | 'downloads' | 'relevance'
export type VersionStatus = 'PUBLISHED' | 'YANKED'

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'INTERNAL'

/** 03 §1.3 */
export interface ErrorBody {
  error: {
    code: ErrorCode
    message: string
    details?: { warnings?: UploadWarning[] }
  }
}

/** 03 §3.3 warnings[] */
export interface UploadWarning {
  code: string
  message: string
  filePath: string | null
}

/** 03 §3.3 */
export interface UploadResult {
  user_id: string
  slug: string
  skill_name: string
  summary: string
  visibility: Visibility
  version: string
  status: 'PUBLISHED'
  fileCount: number
  totalSize: number
  publishedAt: string
  warnings: UploadWarning[]
}

/** 03 §4.2 */
export interface SearchParams {
  q?: string
  user_id?: string
  sort?: SortBy
  page?: number
  size?: number
}

/** 03 §4.3 items[] */
export interface SkillSummary {
  user_id: string
  slug: string
  skill_name: string
  summary: string
  user_name: string
  visibility: Visibility
  downloadCount: number
  headlineVersion: string | null
  publishedAt: string | null
}

/** 03 §4.3 */
export interface SearchResult {
  items: SkillSummary[]
  total: number
  page: number
  size: number
}

/** 03 §5.3 versions[] */
export interface SkillVersion {
  version: string
  status: VersionStatus
  fileCount: number
  totalSize: number
  downloadReady: boolean
  publishedAt: string | null
  yankedAt: string | null
  isHeadline: boolean
}

/** 03 §5.3 */
export interface SkillDetail {
  user_id: string
  slug: string
  skill_name: string
  summary: string
  visibility: Visibility
  hidden: boolean
  user_name: string
  downloadCount: number
  headlineVersion: string | null
  publishedAt: string | null
  versions: SkillVersion[]
}

/** 03 §7.3 */
export interface YankResult {
  user_id: string
  slug: string
  version: string
  status: 'YANKED'
  yankedAt: string
}

/** 03 §8.3 */
export interface HideResult {
  user_id: string
  slug: string
  hidden: true
  updatedAt: string
}
