# innoskill-hub 交接文档(handoff-codex)

> 命名更新（2026-09-14）：平台正式名称为 `innoskill-hub`。本次仅更新文档中的产品称呼；现有仓库路径、配置标识、接口示例与历史原话保留原样。

> 给接手的 Codex。写于 2026-09-14,对应 `innoskill` 仓库 `main@34e7f77`、内容源 `inno-agent-hub` 仓库 `main@3523ed4`。
> 读完这一份就能上手;更细的看文末「关键文件索引」里的四篇 docs。

---

## 0. 三句话

1. **innoskill-hub 是什么**:面向教育场景的 Agent 技能平台。现在是一个 Next.js 16 单进程应用,从 GitHub 仓库 `inno-agent-hub` 同步技能,建索引、打 tar.gz,对人提供浏览 / 搜索 / 详情站,对 agent 提供下载(bundle 协议),对线上 InnoAgent 提供安装台账接口。**第一期 + 第二期接口都做完并验证过,Docker 一键能起。**
2. **最重要的一件事**:2026-09-06 晚需求转向了(用户的话:"我们之前的需求没定义清楚")。innoskill-hub 要成为**技能注册中心**:自己存储技能(不再以 GitHub 为真源)、多租户、给一个独立的「技能制作平台」留发布接口、给 innoagent.tech 留消费接口。**四个关键决策还没拍板,后端不要开建**,详见第 1 节(尤其 1.4)。
3. **现在能做的**:不依赖决策的收尾(第 6.2 节),以及等决策后的后端重构设计(第 6.1 节)。前端可以先动,但接口假设只放 `lib/api.ts` 与 `lib/types.ts`。

---

## 1. 需求重新定义(最重要,先读这节)

用户 09-06 原话:"我们之前的需求没定义清楚……这个 skillhub 相当于一个分发渠道,它本身也承担存储;要设计怎么存、怎么取、怎么做租户区分;留两个接口:制作平台发布、InnoAgent 接入。"

结论已写成文档,**先读这三份,不要读旧版本**:

| 文档 | 内容 |
|---|---|
| `docs/01-需求定义.md` v1.0 | 定位、角色、范围、23 条功能需求、非功能、决策记录、待拍板、验收 |
| `docs/05-HTTP接口设计.md` v1.1 | 上传 / 下载 / 查询 / 搜索接口 |
| `docs/06-后端设计.md` v1.1 + `docs/schema.sql` | 架构、存储、表结构、搜索、时序 |

已确认:PostgreSQL + 阿里云 OSS(S3 API,不用阿里 SDK)、后端直连;租户由登录体系给,只存 `namespace`;制作平台服务端 Bearer 发布、自留源文件;下载给临时 OSS 地址;用户 k 级、技能 w 级;应用层框架待用户指定。

待领导拍板(定了才开工后端):审核要不要、存量 78 个技能去向、包限制、新技能默认可见性。

---

## 2. 全景与仓库

```
技能制作平台(尚不存在,用户口述)──发布接口(待设计)──►  innoskill-hub  ──REST + bundle 协议──► InnoAgent(innoagent.tech,线上多用户版)
                                                        │
                       inno-agent-hub(GitHub,现为唯一内容源)──git 同步──┘
                                                        │
                                                        └──► 独立站(人来挑选、浏览)
```

工作区 `~/GitProjects/innoskill-all/`:

| 目录 | 是什么 | 远端 | 备注 |
|---|---|---|---|
| `innoskill/` | **平台本体**,主要工作对象 | https://github.com/yuyue12111/innoskill(`origin`) | 当前 checkout 在 `font-xiaolai` 分支(PR #1 待设计师定),不是 main |
| `inno-agent-hub/` | 内容源:`skill-library/`(78 技能)+ `workspace-templates/`(19 预设)+ 元数据 JSON | 上游 https://github.com/Chloris-Blaxk/inno-agent-hub(`origin`),用户 fork `yuyue12111/inno-agent-hub`(`fork`) | 是软链接指向 `../inno-agent-hub`,那边有 Claude 的 git worktree 在用,**不要 mv** |
| `inno-agent/` | 上游 hhyqhh/inno-agent 开源单用户 agent(Pi SDK) | 只读 clone | 用来本地联调 bundle 协议;它的 `contentHub.type="bundle"` 指向 innoskill-hub 即可,零改动 |
| `skillhub-reference/` | iflytek/skillhub(Java 企业级技能注册中心) | 只读 clone | 借领域模型(namespace / version / artifact / 发布流程),不 fork 代码 |
| `innoskill-cloud-test/` | 某次"云端部署快照"(`Deploy cloud snapshot with reproducible public assets`),含 `cloud/` `dist/` `out/` | 未知 | **来历不在本交接掌握内**,不是真源;动之前问用户 |

hub 仓库的 PR 流程:在 `fork` 上开分支 → 向上游 `Chloris-Blaxk/inno-agent-hub` 提 PR → 用户让合就 `gh pr merge --merge`。用户是上游的 write 权限(非 admin)。

---

## 3. 技术栈与运行

| 层 | 选择 | 关键点 |
|---|---|---|
| 框架 | **Next.js 16.3 一把梭哈**:Route Handlers 当后端,页面全 `"use client"` 纯 CSR(不做 SSR,但因为 API 在 Next 里,跑的是 `next start` 不是静态导出) | Next 16 与训练数据差别大,**先读 `AGENTS.md` 和 `node_modules/next/dist/docs/`** |
| UI | React 19 + Tailwind 4 + shadcn v4(Base UI,不是 Radix)+ SWR + react-markdown | 字体:Schoolbell(拉丁数字,已在 main)+ 小赖 Xiaolai(汉字,PR #1) |
| 数据 | Node 24 内置 `node:sqlite` + FTS5(trigram,中文可用)+ kv 表 | `lib/server/db.ts` 用 `createRequire` 拿 `node:sqlite`,绕开打包器;单例挂 `globalThis` |
| 同步 | `git clone/pull` + 解析 SKILL.md / README 表 / scenarios.json / packs.json + `tar` 打包 | `instrumentation.ts` 启动同步一次 + `setInterval`;`POST /internal/sync` 给 webhook |
| 部署 | 单容器 `docker compose up --build`,数据卷 `/data` | Dockerfile 支持 `NODE_IMAGE` / `NPM_REGISTRY` 构建参数(国内源) |

```bash
# 本地开发(端口 3000;.env 里 SOURCE_LOCAL_DIR=../inno-agent-hub 可跳过 clone)
cd ~/GitProjects/innoskill-all/innoskill && cp .env.example .env && npm install && npm run dev

# 生产形态(端口 8080;compose 变量都带 INNOSKILL_ 前缀,故意和 dev .env 分开)
INNOSKILL_SERVICE_KEY=devkey docker compose up --build      # 代码有改动必须 --build

# 质量门(2026-09-14 在 font-xiaolai 分支上跑:tsc ok,7 tests pass)
npm run typecheck && npm run lint && npm test && npm run build
```

环境变量见 `.env.example`;线上部署全流程见 `docs/04-部署交接.md`(Caddy HTTPS、国内镜像、备份、排障)。

---

## 4. 进度:已完成并验证的

| 模块 | 状态 | 验证方式 |
|---|---|---|
| 同步:GitHub → SQLite 索引 + tar.gz 缓存 | ✅ | 容器从 GitHub 冷启动 ~12 s,78 技能 / 19 预设 / 5 包 |
| bundle 协议 `/index.json` `/skills/{id}.tar.gz` `/presets/{id}.tar.gz`(可选 Bearer) | ✅ | tar 顶层目录 = id;inno-agent 开源版协议原样实现 |
| REST 目录:`/api/v1/meta` `skills`(q / category / scenario / subject / kind / pack / featured / 分页)`skills/{id}` `skills/{id}/file` `presets*` `map` | ✅ | curl 全过;中英文 FTS |
| 第二期:`/api/v1/packs*`、`/users/{uid}/installs` GET/POST/DELETE、`/stats/skills`、`skills/{id}/view`,`X-Innoskill-Key` 服务密钥 | ✅ | 假 user_id 全流程联调:幂等、整包安装、卸载保留历史、401/403/400/404 |
| 前端:星图首页(精选 21 个,riso 图块 + 布局算法移植到 TS)、技能列表(搜索 + 分类 / 场景 / 学科 / 用途 / 精选 / 技能包筛选)、技能详情(正文、文件树、示例、所属包、在用人数)、预设列表 / 详情、404 | ✅ | 桌面 + 手机视口看过 |
| 内容元数据(在 hub 仓库):`scenarios.json`(场景 / 示例 / `featured`)、`packs.json`(5 包)、78 个 SKILL.md 的 `subject` / `kind` | ✅ 已合并 | hub PR #19 #20 #21 #22 |
| 文档:`01-需求定义`(v0.4)、`02-模块划分`、`03-InnoAgent接入指南`(给 InnoAgent 后端,含 curl 联调脚本)、`04-部署交接` | ✅ | — |
| 字体:Schoolbell 已合 main;小赖 PR #1 开着 | ⏳ | 等设计师拍板,不认可就关 PR / revert `34e7f77` |

没做的(第一期明确非目标):CLI、付费、用户注册、上传发布、爬取、评分评论。

---

## 5. 现在的问题(按严重度)

### 5.1 架构级:需求转向,现有前提不再成立

用户 2026-09-06 晚明确:innoskill-hub 要**自己存储技能、多租户、有发布接口**,GitHub hub 只是导入通道之一。而现有代码和文档处处假设"GitHub 是唯一真源、`runtime/` 全是可重建缓存、没有租户":

- `lib/server/sync/*` 是唯一入口;`db.ts` 表结构无 `tenant_id`、无版本、无可见性
- bundle 协议和 REST 都是单一全局目录
- `README.md` 首段仍写着"只同步、不做发布后台"(`docs/01` 已于 09-15 重写为 v1.0,README 待跟上)
- 这正是 iflytek/skillhub 做的事;当初不 fork 它的理由("80% 功能不需要")有一半已失效。**建议仍保留 TS 栈**(目录 / 台账 / bundle / 前端都能留),但直接借它的领域模型

**未拍板的四个决策**(第 1.4 节),没定之前**不要开建后端**。用户原话:"你不用现在开始构建,只是我们两个要把信息对齐"。

### 5.2 文档与代码漂移

- README 的定位描述已过时;`docs/01` 已重写为 v1.0,`05` / `06` / `07` 是配套设计与评审稿(09-15)
- `docs/03-InnoAgent接入指南` 描述的接口仍然有效,但转向后会加租户维度,届时要升版

### 5.3 内容侧待定(产品决策,不是 bug)

- hub 里 32 个 `education-*` 研究系列技能在 `scenarios.json` 没配场景,兜底落到「创造」星系,显然应归「研究」;示例输入也是兜底句
- `kind=课堂分析` 是预留值,目前 0 个技能
- 星图 `featured` 21 个、5 个技能包的名单和分组是 Claude 拍的初版,等产品确认
- 个别归属有争议:`formative-assessment-technique-selector`→评价测评、`tavily-search`→通用工具、`socratic-tutor` / `learning-opportunities`→信息技术

### 5.4 工程层面的小问题 / 技术债

| 问题 | 位置 | 说明 |
|---|---|---|
| 无数据库迁移机制 | `lib/server/db.ts` | 只有 `CREATE TABLE IF NOT EXISTS`,加列会静默不生效。转向后必引 migrations(手写或 Drizzle) |
| `pack.curated_by` 列暂存 icon 名 | `sync/run.ts`、`catalog.ts` | 为了不改表结构的权宜,重构时换成正经 `icon` 列 |
| `subject` / `kind` 靠 `json_extract(frontmatter_json)` | `catalog.ts` | 无索引;规模小无所谓,转向后落成列 |
| `skill_stat.install_count` 是冗余列 | `installs.ts` | 每次安装 / 卸载后重算;多实例会不一致 |
| 单实例假设 | `scheduler.ts` | 多副本会各自同步、各自定时;SQLite 也不适合多写 |
| bundle 协议无租户维度 | `app/index.json`、`app/skills/[file]` | inno-agent 开源客户端只认无租户形式 |
| 全文搜索 <3 字走 LIKE | `catalog.ts` | trigram 限制,可接受 |
| 浏览计数不去重、无限流 | `installs.ts` | 第一期够用 |
| `Schoolbell/` 原始 TTF 提交在仓库根目录 | 仓库根 | 应挪到 `public/fonts/schoolbell/` 或 `scripts/fonts/`,顺便看 `app/globals.css` 引用方式 |
| `cn` 包与 `clsx` + `tailwind-merge` 双份 | `package.json`、`lib/utils.ts` | shadcn init 装的 `cn`;留一套 |
| innoskill 仓库没有 CI | — | 建议加 GitHub Actions:typecheck + lint + test + build + docker build |
| 首次同步 `packed=0` | 日志 | 不是 bug:tar.gz 按内容哈希缓存,命中就不重打(docs/04 有说明) |
| hub 仓库 `skills-site` 工作流一直红 | hub `.github/workflows/pages.yml` | 上游没开 GitHub Pages(需 admin),不影响 innoskill-hub;innoskill-hub 上线后 hub 的 `docs/` 静态站可退役 |

### 5.5 外部依赖

- InnoAgent 后端**还没有接入**;`docs/03` 给了他们,四个待确认项(密钥分发、`user_id` 形态、沙箱拉包方式、线上地址)没回
- IAM 完全在 InnoAgent 侧,innoskill-hub 只认 `X-Innoskill-Key` + `user_id` 字符串
- 线上部署没做;`docs/04` 是给部署者的完整方案
- 「技能制作平台」只有用户口述,形态、用户体系、产出格式一概未知

---

## 6. 后面要改的

### 6.1 等四个决策拍板后(后端主体工作)

按 iflytek/skillhub 的领域模型起草,落到我们的栈:

1. **领域模型**:`tenant`(命名空间)、`skill`(属于 tenant,`tenant/slug` 唯一)、`skill_version`(不可变,语义化版本,`latest` 指针)、`artifact`(tar.gz,按 sha256 寻址)、`visibility`(private / tenant / public)、`publish_request`(若要审核)
2. **存储层**:接口抽象 `ArtifactStore`(`put / get / head`),本地磁盘实现起步,OSS / S3 实现随后;元数据 SQLite 起步,预留切 Postgres
3. **发布 API**(给制作平台):`POST /api/v1/tenants/{t}/skills/{slug}/versions`(multipart tar.gz 或 zip)→ 校验(SKILL.md 必须、frontmatter 必填 name / description / category / subject / kind、大小、危险文件)→ 入库 → 直接上架或进待审队列;幂等(同版本重复 409);撤回 / 下架
4. **租户化现有接口**:REST 与 bundle 协议加租户维度(路径 `/t/{tenant}/…` 或按 token 解析);用户只见 公开 + 本租户;安装台账加 `tenant_id`
5. **导入器化 sync**:现有 GitHub 同步改成"官方公共库导入器",把 78 个存量灌成某个官方租户下的 v1;或一次性导入后退役 hub
6. **迁移机制 + CI**:先于以上一切

### 6.2 现在就能做(不依赖决策)

- [ ] 文档对齐:README 首段、docs/01 §1-§2 加"转向说明"指向本文第 1 节,避免误导;起草 docs/01 v1.0 骨架(领域模型 / 三组接口 / 待定项)
- [ ] 引入 migrations 机制(哪怕手写 `migrations/*.sql` + 版本表)
- [ ] 加 CI(typecheck + lint + test + build + docker build)
- [ ] `Schoolbell/` 收纳到 `public/fonts/`;`cn` 与 `clsx` 二选一
- [ ] hub `scenarios.json`:给 32 个 `education-*` 配「研究」场景与像样的示例;向上游提 PR
- [ ] 字体 PR #1:等设计师;定了就合或关
- [ ] `/healthz` 顺带返回 packs 数(现在只有 skills / presets)
- [ ] 前端如要按新形态改(租户切换、发布入口占位),接口假设只放 `lib/api.ts` + `lib/types.ts`,别碰 `lib/server/**`

### 6.3 别做

付费 / 计费、CLI、海量爬取与 AI 打分、自建账号体系(IAM 归 InnoAgent)、fork iflytek/skillhub 的 Java 代码。

---

## 7. 约定与规矩

- **文档优先级**:改接口先改 `docs/01-需求定义.md` §8 再动代码;架构问题看 `docs/02-模块划分.md`(三条铁律:数据单向 `sync → db → catalog → route`;`lib/server/**` 是 Node 专属,前端绝不 import;`runtime/` 全是可重建缓存 —— 第三条转向后会变)
- **路径约定**:页面 `/skill/[id]`、`/preset/[id]` 用单数;`/skills/{id}.tar.gz`、`/presets/{id}.tar.gz` 归 bundle 协议。Next 里 `route.ts` 和 `page.tsx` 不能同段
- **Next 16 注意**:Route Handlers 默认不缓存;`params` 是 Promise;Edge runtime 已弃用;`.env` 会被 `next build` 带进 standalone 产物 —— 所以 `.dockerignore` 排除了 `.env*`,compose 变量全部 `INNOSKILL_` 前缀
- **鉴权三把钥匙**:`HUB_TOKEN`(bundle 协议 Bearer,可选)、`SYNC_SECRET`(`X-Sync-Secret`,`/internal/*`)、`SERVICE_KEY`(`X-Innoskill-Key`,`/api/v1/users/*`);未配置即对应接口关闭(403)
- **提交风格**:中文 conventional commits(`feat(ui): …` / `fix(docker): …` / `docs: …`),正文写"为什么";PR 描述末尾带生成标记
- **测试**:`test/parse.test.ts`(vitest)只覆盖解析器;接口验证目前靠 curl 脚本(见 `docs/03` 第 7 节),值得补成集成测试
- **不要**:`git stash`(与其它 worktree 共享栈)、mv `inno-agent-hub` 软链接、在 hub 仓库直接 push 上游 main

---

## 8. 上手清单(15 分钟)

```bash
cd ~/GitProjects/innoskill-all/innoskill
git status && git branch -a                      # 注意当前在 font-xiaolai,主线是 main
cat AGENTS.md                                    # Next 16 的注意事项
sed -n 1,60p docs/01-需求定义.md                  # 定位与决策
cat docs/02-模块划分.md                           # 往哪放代码
cp .env.example .env && sed -i '' 's#^# SOURCE_LOCAL_DIR=.*#SOURCE_LOCAL_DIR=../inno-agent-hub#; s#^SYNC_SECRET=#SYNC_SECRET=devsecret#; s#^SERVICE_KEY=#SERVICE_KEY=devkey#' .env
npm install && npm run dev                       # http://localhost:3000
curl -s localhost:3000/api/v1/meta | jq .data.count
curl -s -H "X-Innoskill-Key: devkey" -H 'Content-Type: application/json' -d '{"packId":"grading"}' localhost:3000/api/v1/users/t-1/installs | jq .data.installed
npm run typecheck && npm run lint && npm test
```

---

## 9. 关键文件索引

| 文件 | 作用 |
|---|---|
| `docs/01-需求定义.md` | 需求基线 v1.0(09-15):角色、范围、功能 / 非功能需求、决策、待拍板、验收 |
| `docs/05-HTTP接口设计.md` · `06-后端设计.md` · `07-评审摘要.md` | 注册中心的接口 / 架构·存储·表结构·搜索·时序 / 一页评审稿(v1.1,09-15) |
| `docs/02-模块划分.md` | 分层、依赖方向、与 iflytek 模块对照、第二期怎么加的 |
| `docs/03-InnoAgent接入指南.md` | 给 InnoAgent 后端:鉴权、店面数据、安装台账、一键添加时序、curl 联调 |
| `docs/04-部署交接.md` | 给部署者:compose、Caddy、国内镜像、备份、排障 |
| `AGENTS.md` / `CLAUDE.md` | Next 16 与训练数据不同的提醒(由 `next dev` 生成,勿删) |
| `instrumentation.ts` → `lib/server/scheduler.ts` | 进程启动同步 + 定时 |
| `lib/server/sync/{git,parse,pack,run}.ts` | 写模型:拉源 / 解析 / 打包 / 事务入库 |
| `lib/server/db.ts` | 建表(skill / skill_fts / preset / pack / pack_skill / user_install / skill_stat / sync_run / kv) |
| `lib/server/catalog.ts` | 读模型:所有查询、DTO、分面、技能包 |
| `lib/server/installs.ts` | 安装台账、统计 |
| `lib/server/map/{index,layout,riso}.ts` | 星图:布局松弛与 riso 图块生成(从 Python 移植) |
| `lib/server/auth/{bundle,internal,service}.ts` | 三把钥匙 |
| `app/api/v1/**/route.ts` | 薄接口层 |
| `app/{page,skills/page,skill/[id]/page,presets/page,preset/[id]/page}.tsx` + `components/**` | 前端(全部 client) |
| `lib/api.ts`、`lib/types.ts` | 前端唯一允许的数据入口与类型 |
| `docker/Dockerfile`、`docker-compose.yml`、`.dockerignore` | 部署 |
| hub `skill-library/{scenarios,packs}.json`、根 README「分类标签」「学科与用途标签」 | 内容元数据与规范 |

---

## 10. 等用户拍板的问题

见第 1.4 节。
