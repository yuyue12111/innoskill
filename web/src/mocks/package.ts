// 上传包的解析与校验，规则照 03 §3.2、§3.4。出错时抛出 PackageError，由上传 handler 转成 400。
import { strFromU8, unzipSync } from 'fflate'
import type { UploadWarning } from '@/api/types'

export interface PackageError {
  kind: 'package'
  message: string
}

const fail = (message: string): never => {
  throw { kind: 'package', message } satisfies PackageError
}

export const isPackageError = (e: unknown): e is PackageError =>
  typeof e === 'object' && e !== null && (e as PackageError).kind === 'package'

const MAX_FILES = 100
const MAX_FILE_BYTES = 10 * 1024 * 1024
const RESERVED_SLUGS = ['admin', 'api', 'me', 'global', 'system']
const SKIPPED = (seg: string) => seg === '__MACOSX' || seg === '.DS_Store' || seg.startsWith('._')

/** 解包：跳过系统垃圾文件；整包多套一层文件夹时剥掉 */
export function readPackage(zip: Uint8Array): Record<string, Uint8Array> {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(zip)
  } catch {
    return fail('文件不是有效的 zip')
  }
  const paths = Object.keys(entries).filter((p) => !p.endsWith('/') && !p.split('/').some(SKIPPED))
  if (paths.some((p) => p.startsWith('/') || p.split('/').includes('..'))) fail('包内路径越出了包根目录')

  const tops = new Set(paths.map((p) => p.split('/')[0]))
  const prefix = tops.size === 1 && paths.every((p) => p.includes('/')) ? `${[...tops][0]}/` : ''
  const files = Object.fromEntries(paths.map((p) => [p.slice(prefix.length), entries[p]]))

  if (paths.length > MAX_FILES) fail(`包内文件超过 ${MAX_FILES} 个`)
  const big = Object.entries(files).find(([, bytes]) => bytes.length > MAX_FILE_BYTES)
  if (big) fail(`文件超过 10 MB：${big[0]}`)
  if (!files['SKILL.md']) fail('包根目录缺少 SKILL.md')
  return files
}

/** 读 SKILL.md 的 YAML frontmatter。只取 name / description / version，够 mock 用即可 */
export function readFrontmatter(skillMd: Uint8Array) {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(strFromU8(skillMd))?.[1] ?? ''
  const lines = block.split(/\r?\n/)
  const get = (key: string) => {
    const i = lines.findIndex((l) => l.startsWith(`${key}:`))
    if (i < 0) return ''
    const value = lines[i].slice(key.length + 1).trim()
    if (!/^[>|]-?$/.test(value)) return value.replace(/^["']|["']$/g, '')
    const rest = lines.slice(i + 1)
    const end = rest.findIndex((l) => !/^\s/.test(l))
    return (end < 0 ? rest : rest.slice(0, end)).map((l) => l.trim()).join(' ')
  }
  const name = get('name')
  const description = get('description')
  if (!name || !description) fail('SKILL.md 缺少 name 或 description')
  return { name, description, version: get('version') }
}

/** slug = slugify(name)，规则见 03 §3.2 */
export function toSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (slug.length < 2 || slug.length > 64) fail(`由 name 生成的短名「${slug}」长度须在 2–64 之间`)
  if (RESERVED_SLUGS.includes(slug)) fail(`短名「${slug}」是保留字`)
  return slug
}

const ALLOWED_EXT = new Set(
  'md txt py js mjs cjs ts json yaml yml toml csv tsv html css sh png jpg jpeg gif svg webp pdf docx xlsx pptx'.split(' '),
)
const SECRET = /AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/

/** 只产生告警的检查（03 §3.4）。magic bytes 检查 mock 里省略 */
export function scanWarnings(files: Record<string, Uint8Array>): UploadWarning[] {
  const warnings: UploadWarning[] = []
  for (const [path, bytes] of Object.entries(files)) {
    const ext = path.includes('.') ? path.split('.').pop()!.toLowerCase() : ''
    if (ext && !ALLOWED_EXT.has(ext)) {
      warnings.push({ code: 'EXTENSION_NOT_ALLOWED', message: `扩展名 .${ext} 不在白名单内`, filePath: path })
    }
    if (SECRET.test(strFromU8(bytes, true))) {
      warnings.push({ code: 'SECRET_SUSPECTED', message: '疑似包含密钥', filePath: path })
    }
  }
  return warnings
}
