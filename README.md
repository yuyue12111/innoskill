# innoskill

技能（Skill）分发平台 MVP：用户把技能打成 zip 上传，别人能搜索、看详情、按版本下载；InnoAgent 从这里取技能。

## 目录

| 路径 | 内容 |
|---|---|
| `docs/` | 设计文档 |
| `server/` | 后端：Hono + Prisma + PostgreSQL + S3 |
| `web/` | 前端：Vite + React（未开始） |

## 后端本地开发

```bash
docker compose up -d                         # PostgreSQL / Redis / MinIO(自动建 bucket)
cd server && cp .env.example .env && npm install
npm run db:migrate                           # 建表
npm run dev                                  # http://localhost:3000/api/skills
```

| 命令 | 作用 |
|---|---|
| `npm test` | 单测 + 接口测试（内存实现，不依赖数据库） |
| `npm run typecheck` / `npm run lint` | 类型检查 / 代码检查（lint 会拦 `class`，见 CLAUDE.md） |
| `npm run build && npm start` | 生产构建与启动；`OTEL_*` 环境变量控制链路追踪 |

## 文档

| 文档 | 内容 |
|---|---|
| [01-需求文档](docs/01-需求文档.md) | 背景、需求点、概念 |
| [02-架构与模块划分](docs/02-架构与模块划分.md) | 分层，上传 / 搜索 / 下载流程图 |
| [03-接口文档](docs/03-接口文档.md) | 6 个接口，前后端唯一契约 |
| [04-库表设计](docs/04-库表设计.md) | 5 张表与对象存储 key 布局 |
| [06-技术栈要求](docs/06-技术栈要求.md) | 前后端选型，后端多态约束 |
| [评审讨论记录](docs/Skill平台后端开发对接与接口文档修正.md) | 与 leader 的讨论结论和待办 |

旧版 Next.js 原型（SQLite + Git 同步）已删除，需要时看 tag `legacy-prototype`。
