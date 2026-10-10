# web

InnoSkill 前端。技术栈按 `docs/06`，接口契约是 `docs/03`。

## 命令

| 命令 | 作用 |
|---|---|
| `npm install` | 安装依赖 |
| `npm run dev` | 开发服务器。**默认走 MSW mock，不需要后端** |
| `npm test` | 契约测试 + 页面测试 |
| `npm run typecheck` | 类型检查 |
| `npm run build` | 类型检查 + 生产构建 |

## 环境变量

放在 `.env.development.local`，示例见 `.env.example`。

| 变量 | 默认 | 作用 |
|---|---|---|
| `VITE_API_MOCK` | 开 | 设为 `false` 关掉 mock，请求发给真后端 |
| `VITE_API_PROXY` | 无 | 关掉 mock 后 `/api` 转发的目标，如 `http://localhost:8080` |

## 身份

| 环境 | 做法 |
|---|---|
| 开发 | 右上角「开发身份」切换匿名 / alice / bob / carol；请求直接带 `X-User-Id`（本地没有网关，见 03 §1.2） |
| 生产 | **未接**。06 选了 OIDC，IdP 未定 |

## Mock

- `src/mocks/handlers.ts` 按 03 实现六个接口。**03 一改，先改这里**；`src/mocks/contract.test.ts` 把 03 的判定表写成了测试用例，会指出哪里对不上。
- 数据在内存里，**刷新页面即重置**。种子数据只取了 `candidates_skills/` 的 name / description / version，仅供展示。
- 种子里的特殊状态：alice 有一个私有技能、一个已下架技能；bob 的 `argument-structure-scaffold-generator` 有三个版本，其中 0.9.1 已下架。

## 目录

| 路径 | 内容 |
|---|---|
| `src/api/` | 03 的类型、请求封装、六个接口函数、TanStack Query hooks |
| `src/mocks/` | MSW mock 与契约测试 |
| `src/pages/` | 搜索、我的技能、详情、上传 |
| `src/components/ui/` | shadcn 生成的组件。`cn` 已改回 06 指定的 clsx + tailwind-merge |

## 等 03 定的事

| 问题 | 前端现在的处理 |
|---|---|
| 告警导致的 400 与硬失败的 400 分不开 | 按「带 `details.warnings` 就是只被告警拦下」处理 |
| 私有技能下载：浏览器 `<a>` 带不上身份头 | 统一用 fetch 下载；302 到对象存储需要对象存储配 CORS |
| 生产身份（OIDC 的 IdP） | 未接 |
