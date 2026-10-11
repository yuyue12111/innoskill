# innoskill

技能（Skill）分发平台 MVP：用户把技能打成 zip 上传，别人能搜索、看详情、按版本下载；InnoAgent 从这里取技能。

## 目录

| 路径 | 内容 |
|---|---|
| `docs/` | 设计文档 |
| `server/` | 后端：Hono + Prisma + PostgreSQL + S3 |
| `web/` | 前端：Vite + React，见 [web/README.md](web/README.md) |

## 后端本地测试（不需要前端）

```bash
docker compose up -d --build                 # 后端 + PostgreSQL + Redis + MinIO,启动时自动建表、建 bucket
```

后端在 `http://localhost:3000`。用 Postman 导入 `server/postman/innoskill.postman_collection.json`，上传请求的 file 选 `server/postman/weather-demo.zip`，按顺序发即可。本地没有网关，身份直接用请求头 `X-User-Id`。

## 后端本地开发

```bash
docker compose up -d postgres redis minio minio-init   # 只起依赖
cd server && cp .env.example .env && npm install
npm run db:migrate                                      # 建表
npm run dev                                             # http://localhost:3000/api/skills
```

| 命令 | 作用 |
|---|---|
| `npm test` | 单测 + 接口测试（内存实现，不依赖数据库） |
| `npm run smoke` | 冒烟测试：对正在运行的后端（`npm run dev` 或 compose 起的都行）+ 真实 PG / MinIO / Redis 跑一遍全流程 |
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
