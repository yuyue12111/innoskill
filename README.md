# innoskill-hub

面向教育场景的**技能注册中心**:制作平台往里发,InnoAgent 从里取,人来这里挑。

- 现状(main):从 [inno-agent-hub](https://github.com/Chloris-Blaxk/inno-agent-hub) 同步、索引、分发,兼容 [inno-agent](https://github.com/hhyqhh/inno-agent) 的 bundle 协议
- 当前设计(2026-09-17,模型评审稿):上传、下载、查询、搜索;使用现成业务库与对象存储,认证权限归网关。建议只保留技能和下载记录两张表,见 [数据模型](./docs/08-数据模型.md) 与 [调整任务清单](./docs/09-调整任务清单.md)。运行代码尚未切换。

## 跑起来

```bash
cp .env.example .env            # 本地开发建议设 SOURCE_LOCAL_DIR=../inno-agent-hub,跳过 git clone
npm install
npm run dev                     # http://localhost:3000,启动时自动同步一次
```

Docker:`docker compose up --build`,监听 8080,数据在 `innoskill-data` 卷。

接 inno-agent:把它的 `contentHub` 改成 `{ "type": "bundle", "baseUrl": "http://localhost:3000" }`。

## 接口

| 路径 | 用途 |
|---|---|
| `GET /index.json` · `GET /skills/{id}.tar.gz` · `GET /presets/{id}.tar.gz` | inno-agent bundle 协议 |
| `GET /api/v1/skills?q=&category=&scenario=&page=&size=` | 列表 / 全文搜索 |
| `GET /api/v1/skills/{id}` · `GET /api/v1/skills/{id}/file?path=` | 详情 / 单文件 |
| `GET /api/v1/presets` · `GET /api/v1/presets/{id}` | 预设 |
| `GET /api/v1/meta` · `GET /healthz` | 分类 / 场景 / 同步状态 |
| `POST /internal/sync`(`X-Sync-Secret`) | webhook 触发同步 |

📄 文档
- [docs/10-工作记录.md](./docs/10-工作记录.md) —— 历史成果、当前进度和未完成事项（截至 2026-09-18）
- [docs/11-周工作计划-2026-09-18至09-24.md](./docs/11-周工作计划-2026-09-18至09-24.md) —— 未来一周的工作安排、交付物及验证标准
- [docs/08-数据模型.md](./docs/08-数据模型.md) —— 本次先评审:两表模型、参考依据、存储关系与取舍
- [docs/schema.sql](./docs/schema.sql) —— 两表 PostgreSQL 初始化草案,尚未执行
- [docs/09-调整任务清单.md](./docs/09-调整任务清单.md) —— 后续文档、代码、迁移与联调任务
- [docs/01-需求定义.md](./docs/01-需求定义.md) —— 旧需求,待按本次讨论精简
- [docs/02-模块划分.md](./docs/02-模块划分.md) —— 现有同步版模块,待按新模型调整
- [docs/05-HTTP接口设计.md](./docs/05-HTTP接口设计.md) · [docs/06-后端设计.md](./docs/06-后端设计.md) · [docs/07-评审摘要.md](./docs/07-评审摘要.md) —— 旧设计,待重写
- [docs/03-InnoAgent接入指南.md](./docs/03-InnoAgent接入指南.md) —— 给 InnoAgent 后端的联调说明
- [docs/04-部署交接.md](./docs/04-部署交接.md) —— 上线部署、配置、备份、运维、排障
