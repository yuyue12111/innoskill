# Innoskill

面向教育场景的 Agent 技能平台:**挑选、展示、供货**。

- 挑选:老师 / 学生 / 研究者按场景找到能用的技能,看示例、看效果
- 展示:严选收录,每个技能有出处、有说明、有演示
- 供货:向 [Inno Agent](https://github.com/hhyqhh/inno-agent) 提供技能与工作区预设的下载(bundle 协议),未来接入线上多用户版 InnoAgent

内容源是 [inno-agent-hub](https://github.com/Chloris-Blaxk/inno-agent-hub) 仓库,技能通过 GitHub PR 进入,Innoskill 只同步、索引、分发,不做发布后台。

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
