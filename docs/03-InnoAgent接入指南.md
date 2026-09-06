# Innoskill × InnoAgent 后端接入指南

> 面向线上 InnoAgent 后端同学。目标:让「技能仓库」页从 Innoskill 取数据,并实现 **一键添加 / 我的技能 / 安装记录 / 安装人数**。
> 版本:接口 v1,对应 Innoskill `main@5714733`(2026-09-06)。有出入以 `GET /api/v1/meta` 返回和本仓库代码为准。

---

## 0. 三十秒看懂

```
浏览器 ──► InnoAgent 后端 ──(服务密钥 + user_id)──► Innoskill REST
                │                                      │
                └─► 用户 agent 的技能目录 ◄──── GET /skills/{id}.tar.gz
```

- Innoskill 是**只读目录 + 安装台账**。技能内容来自 GitHub 仓库 `inno-agent-hub`,Innoskill 同步、索引、打包,不持有主副本。
- **浏览器不直连 Innoskill。** InnoAgent 后端替登录用户调用,带上服务密钥和 `user_id`。
- 两类接口:
  - **REST**(`/api/v1/*`):店面数据(匿名)+ 用户安装台账(服务密钥)。响应壳统一 `{ code, msg, data }`。
  - **bundle 协议**(`/index.json`、`/skills/{id}.tar.gz`、`/presets/{id}.tar.gz`):拉技能包本体。inno-agent 开源版原生支持。
- 「一键添加」= `POST /users/{uid}/installs` → 拿返回的 `bundles` 逐个下载 → 解压到该用户 agent 的技能目录。三步,后端全做,详见第 5 节。

---

## 1. 环境与约定

| 项 | 值 |
|---|---|
| 本地联调地址 | `http://localhost:8080`(`docker compose up --build`,见第 7 节) |
| 线上地址 | 待部署后补 |
| 响应壳 | `{ "code": 0, "msg": "ok", "data": … }`;失败 `code` = HTTP 状态码,`data: null` |
| 编码 | UTF-8 JSON;query 参数含中文必须 URL 编码 |
| 时间 | ISO 8601 UTC 字符串,如 `2026-09-06T09:19:03.640Z` |
| 分页 | `page` 从 1 起,`size` 默认 50,最大 200 |
| 缓存建议 | `meta` / `skills` 列表可缓存 60 s;`tar.gz` 与 demo 图带 `Cache-Control` |
| 内容更新延迟 | hub 仓库合并后 ≤ `SYNC_INTERVAL_MIN`(默认 10 分钟);也可由 webhook 立即触发 |
| 限流 | 目前没有 |

### 1.1 鉴权

| 接口组 | 鉴权 | 说明 |
|---|---|---|
| 店面数据 `/api/v1/skills*` `/packs*` `/presets*` `/meta` `/stats*` `/assets/*` | 匿名 | 直接调 |
| 用户台账 `/api/v1/users/*` | **`X-Innoskill-Key: <服务密钥>`** | 密钥由 Innoskill 部署方配置(环境变量 `SERVICE_KEY`),线下交给 InnoAgent 后端保管;未配置 → 403,不匹配 → 401 |
| bundle 协议 `/index.json` `/skills/*.tar.gz` `/presets/*.tar.gz` | 可选 `Authorization: Bearer <HUB_TOKEN>` | 只在 Innoskill 开了 `HUB_TOKEN` 时需要;私有部署建议开 |

### 1.2 `user_id`

- 由 InnoAgent 决定,Innoskill **只校验形态,不校验存在**:`^[A-Za-z0-9_.:@-]{1,128}$`。UUID、数字 ID、`tenant:uid` 都行
- 请保证**稳定且唯一**:它是安装台账的主键之一,换了就是另一个人
- IAM(登录、鉴权、租户)完全在 InnoAgent 侧,Innoskill 不感知

---

## 2. 名词

| 名词 | 是什么 | 唯一键 |
|---|---|---|
| skill 技能 | 一个目录:`SKILL.md`(frontmatter + 正文)+ 附属文件;Pi SDK / Claude Agent Skills 格式 | `id` = 目录名,如 `k12-lesson-planning` |
| pack 技能包 | 严选的技能组合,如「批改与评价技能包」 | `id`,如 `grading` |
| preset 工作区预设 | `preset.json` + `agent.md` + 私有技能,inno-agent 简单模式用 | `id` |
| install 安装记录 | (`user_id`, `skill_id`) 一条,卸载只打时间戳不删 | — |
| bundle 包 | 某技能 / 预设目录的 tar.gz,**顶层目录名 = id** | — |

技能的四个分类维度,店面按需取用:

| 字段 | 取值 | 用途 |
|---|---|---|
| `category` | 教学辅导 / 内容创作 / 文档处理 / 研究检索 / 开发工具 | 粗分类,inno-agent 客户端按它分组 |
| `scenario` | 备课 / 讲课 / 自学 / 研究 / 创造 | 星图场景 |
| `subject` | 跨学科 / 语文 / 数学 / … / 信息技术 / 艺术 / 其它 | **店面「学科」tab** |
| `kind` | 教学设计 / 课件生成 / 评价测评 / 学习辅导 / 课堂分析 / 教研科研 / 文档处理 / 内容创作 / 开发工具 / 通用工具 | **店面「用途」标签** |

取值与计数以 `GET /api/v1/meta` 为准,**tab 不要写死**。完整取值表见 hub 仓库根 README「学科与用途标签」。

---

## 3. 店面数据接口(匿名)

### 3.1 `GET /api/v1/meta` —— 渲染 tab / 筛选条

```json
{
  "code": 0, "msg": "ok",
  "data": {
    "name": "Innoskill",
    "repo": "https://github.com/Chloris-Blaxk/inno-agent-hub",
    "count": { "skills": 78, "presets": 19, "featured": 21 },
    "categories": [ { "name": "教学辅导", "count": 26 }, … ],
    "scenarios":  [ { "key": "备课", "title": "怎么备好一节课?", "blurb": "…", "color": { "bg": "#cdd9ce", "fg": "#3f5c48", "ink": "#2f4636" }, "count": 12 }, … ],
    "subjects":   [ { "name": "跨学科", "count": 61 }, { "name": "其它", "count": 10 }, { "name": "数学", "count": 3 }, … ],
    "kinds":      [ { "name": "教研科研", "count": 33 }, { "name": "课件生成", "count": 9 }, … ],
    "lastSync": { "at": "2026-09-06T09:28:57.064Z", "sha": "54537c6", "ref": "main", "skills": 78, "presets": 19 },
    "syncing": false
  }
}
```

### 3.2 `GET /api/v1/skills` —— 列表 / 搜索

| 参数 | 说明 |
|---|---|
| `q` | 全文搜索(名称、描述、一句话、正文;≥3 字走 FTS,更短走 LIKE),中英文都可以 |
| `category` `scenario` `subject` `kind` | 精确匹配;`scenario` 同时匹配主场景与兼属场景 |
| `pack` | 只看某技能包内的技能 |
| `featured=1` | 只看精选(星图那一组) |
| `page` `size` | 分页 |

以上可任意组合。响应 `data`:

```json
{ "items": [ SkillSummary… ], "total": 9, "page": 1, "size": 50 }
```

**SkillSummary**(列表项、技能包内、安装记录里都用它):

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 技能 id = 目录名 = 安装后的目录名 |
| `name` `description` | string | frontmatter 的 name / description(description 含触发词,适合搜索,不适合展示) |
| `tagline` | string | 一句话简介,**卡片用这个** |
| `category` `scenario` `subject` `kind` | string | 四个维度 |
| `also` | string[] | 兼属场景 |
| `type` | string | `收集` / `贡献` / `原创` |
| `verified` `featured` | boolean | 已验证 / 精选 |
| `refText` `refUrl` | string | 来源(GitHub 仓库) |
| `demo` `hasDemo` | string, boolean | 演示 gif 绝对地址,没有则 `""` |
| `example` | string | 「试试这句话」示例输入,可直接填进对话框 |
| `installCount` `viewCount` | number | 安装人数(未卸载的去重用户数)/ 浏览数 |
| `num` `group` | string | 序号 / README 分组,展示用 |

### 3.3 `GET /api/v1/skills/{id}` —— 详情

在 SkillSummary 之上多:

| 字段 | 说明 |
|---|---|
| `packs` | `[{ id, name }]` 所属技能包 |
| `frontmatter` | SKILL.md 的 frontmatter 全量 |
| `files` | `[{ path, size }]` 文件清单 |
| `body` | SKILL.md 正文(Markdown,去掉 frontmatter) |
| `bundleUrl` | 该技能 tar.gz 的绝对地址 |
| `contentHash` `syncedAt` | 内容哈希 / 同步时间;哈希变了说明技能更新了 |

404:`{ "code": 404, "msg": "skill not found", "data": null }`

### 3.4 `GET /api/v1/skills/{id}/file?path=SKILL.md[&raw=1]`

读技能里的单个文件。文本类返回 `{ path, size, mime, content }`;`raw=1` 或二进制(图片等)直接回字节。越界路径 400,不存在 404,>5 MB 413。

### 3.5 `GET /api/v1/packs` · `GET /api/v1/packs/{id}` —— 技能包

```json
{ "items": [ { "id": "grading", "name": "批改与评价技能包", "description": "…", "icon": "square-check",
               "subject": "跨学科", "skillCount": 5, "installCount": 1 } … ], "total": 5 }
```

- `icon` 是 [lucide](https://lucide.dev/icons) 图标名
- `installCount` = 装了包内**任一**技能且未卸载的去重用户数
- 详情多一个 `skills: [ SkillSummary… ]`,按包内顺序

### 3.6 `GET /api/v1/presets` · `GET /api/v1/presets/{id}` —— 工作区预设

列表项 `{ id, name, description, icon }`;详情多 `meta`(preset.json 全量)、`files`、`bundleUrl`、`contentHash`、`syncedAt`。单文件读取:`GET /api/v1/presets/{id}/file?path=agent.md`。

### 3.7 `GET /api/v1/stats/skills` —— 排行

`{ "items": [ { "id", "installCount", "viewCount" } … ] }`,按安装数、浏览数降序。做「热门」用。

### 3.8 `POST /api/v1/skills/{id}/view` —— 浏览计数

用户打开技能详情时调一次;匿名、不去重。返回 `{ "id" }`。

### 3.9 `GET /assets/{id}/demo.gif` —— 演示素材

`demo` 字段给的就是这个地址,直接 `<img src>`。

---

## 4. 用户台账接口(服务密钥)

所有请求带 `X-Innoskill-Key: <服务密钥>`。

### 4.1 `POST /api/v1/users/{uid}/installs` —— 安装(幂等)

请求体三选一:

```json
{ "skillId": "k12-lesson-planning" }
{ "skillIds": ["docx", "pptx"] }
{ "packId": "grading" }
```

响应(有新装 **201**,全都已装过 **200**):

```json
{
  "code": 0, "msg": "ok",
  "data": {
    "userId": "teacher-002",
    "pack": { "id": "grading", "name": "批改与评价技能包" },
    "installed":        ["homework-grader", "comment-on-docx", "Exam2Knowledge", "k12-lesson-differentiation", "docx"],
    "alreadyInstalled": [],
    "unknown":          [],
    "bundles": {
      "homework-grader": "http://localhost:8080/skills/homework-grader.tar.gz",
      "comment-on-docx": "http://localhost:8080/skills/comment-on-docx.tar.gz",
      …
    }
  }
}
```

- `installed` 本次新记录的;`alreadyInstalled` 之前就在用的;`unknown` 不存在的 id(忽略,不报错)
- **`bundles` 把 `installed + alreadyInstalled` 每个技能的 tar.gz 地址都给了**,后端直接拿去下载,不用再查
- 卸载过再装:恢复为在用,`installed_at` 更新
- 错误:400 uid 不合法 / body 不是 JSON / 三个字段都没给;404 `packId` 不存在或所有 id 都不存在

### 4.2 `GET /api/v1/users/{uid}/installs[?history=1]` —— 我的技能 / 安装记录

```json
{ "userId": "teacher-002", "total": 5,
  "items": [ { "skill": SkillSummary, "installedAt": "2026-09-06T09:06:12.101Z", "uninstalledAt": null } … ] }
```

默认只返回在用的;`history=1` 连已卸载的一起返回(`uninstalledAt` 非空),按安装时间倒序。

### 4.3 `DELETE /api/v1/users/{uid}/installs/{skillId}` —— 卸载

200 `{ "userId", "skillId", "removed": true }`;没装或已卸载 404。记录保留(`uninstalledAt` 打时间戳),安装人数立即减一。

---

## 5. 完整流程

### 5.1 一键添加(单个技能或整包)

```
InnoAgent 后端                                  Innoskill
   │  POST /api/v1/users/{uid}/installs {packId}  │
   │ ───────────────────────────────────────────► │  记台账,重算安装人数
   │  ◄──────────── 201 { installed, bundles }    │
   │                                              │
   │  for each bundles[id]:                       │
   │    GET {url}   (可带 Bearer HUB_TOKEN)        │
   │ ───────────────────────────────────────────► │
   │  ◄──────────── application/gzip              │
   │  tar -xzf - -C <该用户技能目录>/<id> --strip-components=1
   │                                              │
   │  让该用户的 agent 重新加载技能(开源版是 POST /api/skills/reload)
   │  刷新「我的技能」:GET /users/{uid}/installs   │
```

要点:

- **先记台账再下载**,下载失败可重试 `GET {url}`,不必再 POST(幂等)
- tar 顶层目录名 = id,用 `--strip-components=1` 解到 `<技能目录>/<id>/`,这样 agent 用目录名发现技能(与 Pi SDK 约定一致)
- 下载谁来做:**建议 InnoAgent 后端下载后写入用户沙箱**(沙箱不用出网,密钥只在后端);若沙箱能出网也可以直连,开 `HUB_TOKEN` 即可
- 整包安装的 `bundles` 已按包内顺序给全;部分技能已装过也会出现在 `bundles` 里,是否重新解压由后端决定(可用详情的 `contentHash` 判断有没有更新)

### 5.2 卸载

`DELETE /users/{uid}/installs/{id}` → 删除 `<技能目录>/<id>/` → reload。

### 5.3 「我的技能」页

`GET /users/{uid}/installs` 一次拿全,每项自带 SkillSummary,不用再逐个查详情。

### 5.4 「技能商店」页

1. `GET /meta` 渲染学科 tab(`subjects`)、用途标签(`kinds`)、数量
2. `GET /packs` 渲染「学科技能包」卡片,详情 `GET /packs/{id}`
3. `GET /skills?subject=&kind=&q=` 渲染列表;卡片用 `tagline`、`installCount`、`demo`
4. 是否已添加:把 `GET /users/{uid}/installs` 的 id 集合和列表做交集(列表接口是匿名的,不知道用户)
5. 打开详情:`GET /skills/{id}` + `POST /skills/{id}/view`

---

## 6. bundle 协议(给 agent 运行时)

如果 InnoAgent 的 agent 运行时就是 inno-agent 开源版,**不用写代码**,配置指过来即可:

```json
{ "contentHub": { "type": "bundle", "baseUrl": "http://<innoskill>", "token": "<HUB_TOKEN 或空>" } }
```

协议本身三个接口,自己实现也很简单:

| 接口 | 返回 |
|---|---|
| `GET /index.json` | `{ generated, count, skills: [{ id, name, description, category, … }], presets: [{ id, name, description, icon }] }`(无响应壳) |
| `GET /skills/{id}.tar.gz` | 技能目录 tar.gz,顶层目录名 = id |
| `GET /presets/{id}.tar.gz` | 预设目录 tar.gz |

---

## 7. 本地联调

```bash
# 1. 起 Innoskill(首次会从 GitHub 拉内容,约 10 秒)
git clone git@github.com:yuyue12111/innoskill.git && cd innoskill
INNOSKILL_SERVICE_KEY=devkey docker compose up --build      # http://localhost:8080

# 2. 店面数据
curl -s localhost:8080/api/v1/meta | jq .data.count
curl -s -G --data-urlencode "subject=数学" --data-urlencode "kind=课件生成" localhost:8080/api/v1/skills | jq '.data.items[].id'
curl -s localhost:8080/api/v1/packs | jq '.data.items[] | {id, skillCount}'

# 3. 用假 user_id 走一遍安装
K="X-Innoskill-Key: devkey"; U=localhost:8080/api/v1/users/teacher-001/installs
curl -s -H "$K" -H 'Content-Type: application/json' -d '{"packId":"grading"}' $U | jq '.data | {installed, bundles}'
curl -s -H "$K" $U | jq '.data.items[].skill.id'
curl -s -X DELETE -H "$K" $U/docx | jq .data
curl -s -H "$K" "$U?history=1" | jq '.data.items[] | {id: .skill.id, uninstalledAt}'

# 4. 拉一个包解开看看
curl -s localhost:8080/skills/k12-lesson-planning.tar.gz | tar -tzf - | head
```

数据在 Docker 卷 `innoskill-data`,`docker compose down -v` 可清空重来。

---

## 8. 状态码速查

| 码 | 什么时候 |
|---|---|
| 200 | 成功;安装接口"全都已装过"也是 200 |
| 201 | 安装接口至少新记录了一个 |
| 400 | uid 不合法、body 不是 JSON、缺参数、路径越界 |
| 401 | 服务密钥不对;或 bundle 协议缺 Bearer |
| 403 | Innoskill 未配置 `SERVICE_KEY`(用户接口整组关闭)或 `SYNC_SECRET` |
| 404 | 技能 / 包 / 预设 / 文件不存在;卸载未安装的技能 |
| 413 | 单文件 > 5 MB |
| 502 | 目前不会;同步失败不影响读接口,继续用上一版索引 |

---

## 9. 明确不做 / 待定

- **不做**:付费与计费、用户注册登录、技能上传发布、CLI、评分评论
- **待定,需 InnoAgent 侧拍板**:
  1. 服务密钥的分发与轮换方式(Innoskill 侧只是改环境变量重启)
  2. `user_id` 用什么(UUID / 数字 / `tenant:uid`),定了别再变
  3. 沙箱拉 tar.gz 走后端中转还是直连(见 5.1)
  4. 线上 Innoskill 的部署地址与域名

---

## 附录 A. 一眼表

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| GET | `/api/v1/meta` | 匿名 | 分类 / 学科 / 用途 / 场景 / 计数 / 同步状态 |
| GET | `/api/v1/skills?q&category&scenario&subject&kind&pack&featured&page&size` | 匿名 | 列表 / 搜索 |
| GET | `/api/v1/skills/{id}` | 匿名 | 详情 |
| GET | `/api/v1/skills/{id}/file?path=&raw=` | 匿名 | 单文件 |
| POST | `/api/v1/skills/{id}/view` | 匿名 | 浏览计数 |
| GET | `/api/v1/packs` · `/api/v1/packs/{id}` | 匿名 | 技能包 |
| GET | `/api/v1/presets` · `/api/v1/presets/{id}` · `/presets/{id}/file` | 匿名 | 工作区预设 |
| GET | `/api/v1/stats/skills` | 匿名 | 安装 / 浏览排行 |
| GET | `/api/v1/users/{uid}/installs?history=` | 服务密钥 | 我的技能 / 安装记录 |
| POST | `/api/v1/users/{uid}/installs` | 服务密钥 | 安装(skillId / skillIds / packId) |
| DELETE | `/api/v1/users/{uid}/installs/{skillId}` | 服务密钥 | 卸载 |
| GET | `/index.json` · `/skills/{id}.tar.gz` · `/presets/{id}.tar.gz` | 可选 Bearer | bundle 协议 |
| GET | `/assets/{id}/…` | 匿名 | 演示素材 |
| GET | `/healthz` | 匿名 | 存活 + 最近同步 |

## 附录 B. 联系

接口实现在 `app/api/v1/**/route.ts`,查询在 `lib/server/catalog.ts`,台账在 `lib/server/installs.ts`。改接口请先改 `docs/01-需求定义.md` 第 8 节再动代码。
