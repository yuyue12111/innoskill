# innoskill-hub

面向教育场景的**技能注册中心**:制作平台往里发,InnoAgent 从里取,人来这里挑。

- 现状(main):从 [inno-agent-hub](https://github.com/Chloris-Blaxk/inno-agent-hub) 同步、索引、分发,兼容 [inno-agent](https://github.com/hhyqhh/inno-agent) 的 bundle 协议
- 目标(设计定稿,待开发):自存储(PostgreSQL + OSS)、租户隔离、发布接口。见 `docs/01-需求定义.md` v1.0 与 `docs/05` `06` `07`

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
- [docs/01-需求定义.md](./docs/01-需求定义.md) —— 定位、决策、接口与数据模型
- [docs/02-模块划分.md](./docs/02-模块划分.md) —— 代码往哪放
- [docs/03-InnoAgent接入指南.md](./docs/03-InnoAgent接入指南.md) —— 给 InnoAgent 后端的联调说明
- [docs/04-部署交接.md](./docs/04-部署交接.md) —— 上线部署、配置、备份、运维、排障
