import '@testing-library/jest-dom/vitest'
import { Blob, File } from 'node:buffer'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { useIdentity } from '@/auth/identity'
import { resetDb } from '@/mocks/db'
import { server } from '@/mocks/node'

// jsdom 的 File / Blob / FormData 和 Node 自带的 fetch 不兼容（上传时 multipart 解析会断言失败），
// 测试里换回 Node 原生实现。React DOM 还会调用 new FormData(form)，Node 版不支持，借 jsdom 版转一手。
// 只影响测试环境。
const JsdomFormData = globalThis.FormData
const NodeFormData = (
  await new Response('', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).formData()
).constructor as typeof FormData
const CompatFormData = new Proxy(NodeFormData, {
  construct(target, [form, submitter]) {
    const data = new target()
    if (form) for (const [key, value] of new JsdomFormData(form, submitter)) data.append(key, value)
    return data
  },
})
// jsdom 没有 ResizeObserver，Radix 的 RadioGroup 要用
const NoopResizeObserver = function () {
  return { observe() {}, unobserve() {}, disconnect() {} }
} as unknown as typeof ResizeObserver
Object.assign(globalThis, { Blob, File, FormData: CompatFormData, ResizeObserver: NoopResizeObserver })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetDb()
  useIdentity.setState({ userId: null })
})
afterAll(() => server.close())
