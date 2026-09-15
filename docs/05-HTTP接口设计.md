# innoskill-hub HTTP 接口设计 v1.1(上传 / 下载 / 查询 / 搜索)

> 2026-09-15 定稿待评审。innoskill-hub 是技能注册中心:自己存技能(PostgreSQL + 阿里云 OSS,走 S3 兼容 API)、给制作平台发布、给 InnoAgent 消费。
> 参考 iflytek/skillhub 的坐标、版本与 resolve 设计,不照搬其 RBAC / 命名空间治理。
> 租户由登录体系给出,本服务只把 `namespace` 当隔离键存和查,**不做租户管理**。标 ⚠️ 的项见第 8 节,等领导拍板。

---

## 1. 一页看懂

```
制作平台 ──Bearer 发布令牌──► POST /skills/{ns}/{slug}/versions   (上传)
InnoAgent ──服务密钥──────► GET  /skills/{ns}/{slug}/download   (下载)
任何人   ──匿名──────────► GET  /skills · /skills/{ns}/{slug}  (查询)
任何人   ──匿名──────────► GET  /search?q=                      (搜索)
```

| 约定 | 值 |
|---|---|
| 前缀 | `/api/v1`,JSON UTF-8 |
| 响应壳 | `{ "code": 0, "msg": "ok", "data": … }`;失败 `code` = HTTP 状态码,校验类错误在 `data.errors[]` |
| 坐标 | **`{namespace}/{slug}`**,如 `official/k12-lesson-planning`。`namespace` = 租户标识(登录体系给),`official` 保留给平台官方库;`slug` = 目录名 = 安装后目录名,`^[a-z0-9][a-z0-9-]{1,63}$` |
| 版本 | 语义化版本 `1.2.0`,**发布后不可变**;`latest` = 最新已发布版本,系统维护 |
| 分页 | `page` 从 1 起,`size` 默认 20,最大 100 |
| 时间 | ISO 8601 UTC |

### 对象模型

| 对象 | 字段要点 |
|---|---|
| Namespace | `name`(唯一,`^[a-z0-9][a-z0-9-]{1,31}$`)、`displayName`、`kind`(`official` / `tenant`);首次发布时自动创建,无成员、无策略 |
| Skill | 坐标、`visibility`(`public` / `tenant` / `private`)、`latestVersion`、`deprecated`、统计(下载 / 安装 / 浏览) |
| SkillVersion | `version`、`status`(`pending` / `published` / `rejected` / `yanked`)、`sha256`、`size`、`fileCount`、`frontmatter`、`files[]`、`changelog`、`publishedBy`、`publishedAt` |
| Artifact | 版本对应的 tar.gz,按 `sha256` 内容寻址,顶层目录名 = `slug` |

`namespace` 就是租户标识,谁是哪个租户由登录体系决定,本服务不问。`official` 保留给平台官方库(现有 78 个技能从 GitHub 导入到这里)。

---

## 2. 鉴权

| 谁 | 凭证 | 能做什么 |
|---|---|---|
| 匿名 | 无 | 读 `public` 技能;搜索;下载 `public` |
| 制作平台 | `Authorization: Bearer <发布令牌>`,令牌代表制作平台这个系统 | 向路径里的 namespace 上传、改可见性、下架(namespace 归属由制作平台自己保证);读该 namespace 的全部 |
| InnoAgent 后端 | `X-Innoskill-Key: <服务密钥>` + `X-Innoskill-Tenant: <namespace>` | 读 `public` + 该租户的 `tenant` 技能;用户安装台账(见 `03-InnoAgent接入指南`) |
| 平台管理员 | `Authorization: Bearer <管理令牌>` | 审核、建 namespace、发令牌 |

令牌一期由部署方在配置里签发,二期再做 `/tokens` 管理接口。未带凭证访问受限资源 → 401;凭证无权 → 403;资源对当前身份不可见 → **404**(不泄露存在性)。

---

## 3. 上传(发布)

### 3.1 `POST /api/v1/skills/{ns}/{slug}/versions`

`multipart/form-data`:

| 字段 | 必填 | 说明 |
|---|---|---|
| `file` | 是 | `.tar.gz` 或 `.zip`,包内**必须**有根目录 `SKILL.md`(大小写宽容,入库归一为 `SKILL.md`) |
| `version` | 否 | 不传则读 `SKILL.md` frontmatter 的 `version`;两处都没有 → 400 |
| `changelog` | 否 | 本版说明,Markdown |

服务端校验(任一失败 → 400,`data.errors[]` 列全部问题):

| 规则 | 值 ⚠️ |
|---|---|
| frontmatter 必填 | `name`(必须等于 `slug`)、`description`、`category`、`subject`、`kind`(取值表见 hub README) |
| 包 | 总大小 ≤ 30 MB,单文件 ≤ 5 MB,文件数 ≤ 300 |
| 路径 | 禁止 `..`、绝对路径、符号链接;顶层多余目录自动剥离 |
| 内容 | 禁止可执行二进制;脚本类(`.sh` `.py` `.js` …)允许但标记 `hasScripts: true` 供前端提示 |

结果:

| 情况 | 状态码 | 说明 |
|---|---|---|
| 新版本入库 | **201** | 一期**发布即上架**:`status=published`,`latest` 立即指向它。审核流(`pending` → 通过)是二期开关 ⚠️ |
| 同版本、同 sha256 重传 | 200 | 幂等,返回已有版本 |
| 同版本、不同内容 | **409** | 版本不可变,请升版本号 |
| slug 不存在 | 201 | 自动创建 Skill(和 namespace),`visibility` 默认 `tenant` ⚠️ |
| 包超限 | 413 | — |

```json
{ "code": 0, "msg": "ok", "data": {
  "namespace": "sch-01", "slug": "poetry-lesson", "version": "1.0.0", "status": "published",
  "sha256": "sha256:9f2c…", "size": 184320, "fileCount": 7, "hasScripts": false,
  "frontmatter": { "name": "poetry-lesson", "category": "教学辅导", "subject": "语文", "kind": "教学设计", "…": "…" },
  "downloadUrl": "/api/v1/skills/sch-01/poetry-lesson/versions/1.0.0/download",
  "publishedAt": "2026-09-14T08:00:00Z"
} }
```

### 3.2 管理已发布内容

| 方法 | 路径 | 说明 |
|---|---|---|
| PATCH | `/skills/{ns}/{slug}` | `{ visibility?, deprecated?, displayName? }` |
| POST | `/skills/{ns}/{slug}/versions/{v}/yank` | 下架该版本(文件保留,不再解析为 latest,直链下载 410) |
| POST | `/skills/{ns}/{slug}/versions/{v}/review` | 二期(审核开关打开后):管理员 `{ "decision": "approve" \| "reject", "note"? }` |
| DELETE | `/skills/{ns}/{slug}/versions/{v}` | 二期:仅 `pending` / `rejected` 可删;已发布只能 yank |

不提供"覆盖发布"和"删除已发布版本":registry 的可信度靠不可变。

---

## 4. 下载

**包本体不经过本服务**:下载接口返回一个**临时 OSS 地址**(预签名 URL,10 分钟有效),前端 / InnoAgent 直接去 OSS 拿。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/skills/{ns}/{slug}/download` | 最新已发布版本 → `{ url, expiresIn, version, sha256, size }` |
| GET | `/skills/{ns}/{slug}/versions/{v}/download` | 指定版本,同上;加 `?redirect=1` 直接 302 到该地址(给只会跟跳转的客户端) |
| GET | `/skills/{ns}/{slug}/resolve?version=&tag=&hash=` | **只解析不下载**,给 agent 做"要不要更新"判断 |
| GET | `/skills/{ns}/{slug}/versions/{v}/files` | 文件清单 `[{ path, size, sha256 }]` |
| GET | `/skills/{ns}/{slug}/versions/{v}/file?path=` | 单文件;文本类由本服务读出回 `{ path, size, mime, content }`;图片等二进制回 `{ url }` 临时地址 |

```json
{ "code": 0, "msg": "ok", "data": {
  "namespace": "official", "slug": "k12-lesson-planning", "version": "1.3.0",
  "sha256": "sha256:9f2c…", "size": 184320,
  "url": "https://<bucket>.oss-cn-….aliyuncs.com/artifacts/9f/2c/9f2c….tar.gz?X-Amz-Signature=…",
  "expiresIn": 600
} }
```

包是 tar.gz,顶层目录 = `slug`(客户端 `--strip-components=1` 解到 `<技能目录>/<slug>/`)。地址按 sha256 内容寻址,同一版本永远同一个对象,客户端可按 `sha256` 做本地缓存。

`resolve` 的规则照搬 skillhub:`version` 与 `tag` 互斥;只传 `hash` 时比对已发布版本,返回 `matched: true/false` 与最新版本;都不传 = latest。

```json
{ "code": 0, "msg": "ok", "data": {
  "namespace": "official", "slug": "k12-lesson-planning", "version": "1.3.0",
  "sha256": "sha256:9f2c…", "matched": false,
  "downloadUrl": "/api/v1/skills/official/k12-lesson-planning/versions/1.3.0/download"
} }
```

**兼容 inno-agent 开源版**:`/index.json`、`/skills/{slug}.tar.gz`、`/presets/{id}.tar.gz` 继续保留,等价于 `official` namespace 的 latest;`.tar.gz` 路径 302 到临时地址(它的客户端会跟跳转);带 `X-Innoskill-Tenant` 时叠加该租户可见的技能。

---

## 5. 查询

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/namespaces` | 可见的 namespace 列表 `{ name, displayName, kind, skillCount }` |
| GET | `/namespaces/{ns}` | 详情 + 统计 |
| GET | `/skills` | 全局列表,见下方参数 |
| GET | `/skills/{ns}/{slug}` | 技能详情:SkillSummary + `latestVersion` 详情 + `versions[]` 摘要 + `packs[]` |
| GET | `/skills/{ns}/{slug}/versions` | 版本列表(匿名只见 `published`;发布方还见自己的 `pending` / `rejected` / `yanked`) |
| GET | `/skills/{ns}/{slug}/versions/{v}` | 版本详情:frontmatter 全量、`files[]`、`changelog`、`sha256` |
| GET | `/meta` | 分面:`namespaces` / `categories` / `subjects` / `kinds` / `scenarios` 的取值与计数,tab 靠它渲染 |

`GET /skills` 参数,全部可组合:

| 参数 | 说明 |
|---|---|
| `namespace` | 只看某 namespace |
| `category` `subject` `kind` `scenario` | 精确匹配 |
| `pack` `featured=1` | 技能包内 / 精选 |
| `sort` | `recent`(默认,按最新发布时间)/ `downloads` / `installs` / `name` |
| `page` `size` | 分页 |

**SkillSummary**(列表项统一形状):

```json
{ "namespace": "official", "slug": "k12-lesson-planning", "displayName": "K-12 备课",
  "tagline": "从零备一节课…", "category": "教学辅导", "subject": "跨学科", "kind": "教学设计", "scenario": "备课",
  "visibility": "public", "latestVersion": "1.3.0", "publishedAt": "2026-09-10T02:00:00Z",
  "hasScripts": false, "demo": "https://…/demo.gif",
  "stats": { "downloads": 1280, "installs": 96, "views": 4410 } }
```

可见性规则:匿名只见 `public`;带 `X-Innoskill-Tenant` 再见该租户的 `tenant`;发布令牌再见其 namespace 的 `private`。没有已发布版本的技能对外不可见。

### 与现有接口的关系

现有 `/skills/{id}`、`/skills/{id}/file`、`/packs*`、`/presets*`、`/users/{uid}/installs*`、`/stats/skills` 保留,单段 `{id}` 视为 `official/{id}`。安装台账二期改为记 `namespace / slug / version` 三元组。

---

## 6. 搜索

### `GET /api/v1/search`

| 参数 | 说明 |
|---|---|
| `q` | 必填。全文匹配 `displayName` / `tagline` / `description` / SKILL.md 正文,中英文;≥ 3 字走 FTS,更短走前缀 |
| `namespace` `category` `subject` `kind` | 过滤,同 `/skills` |
| `sort` | `relevance`(默认)/ `downloads` / `recent` |
| `page` `size` | 分页 |

```json
{ "code": 0, "msg": "ok", "data": {
  "q": "备课", "total": 12, "page": 1, "size": 20,
  "items": [ { "…SkillSummary": "…", "score": 8.7, "highlight": { "tagline": "从零<em>备</em>一节<em>课</em>…" } } ],
  "facets": { "category": [ { "name": "教学辅导", "count": 9 } ], "subject": [ … ], "kind": [ … ] }
} }
```

- `facets` 是**本次结果集**内的分面计数,前端做"搜索后再筛"
- 搜索范围受同一套可见性规则约束
- 语义搜索(向量)不在一期;接口预留 `mode=semantic`,默认 `mode=text`

---

## 7. 状态码

| 码 | 何时 |
|---|---|
| 200 / 201 | 成功 / 新建(发布新版本) |
| 400 | 参数或包校验失败,`data.errors[] = [{ path, rule, message }]` |
| 401 / 403 | 无凭证 / 凭证无权 |
| 404 | 不存在,或对当前身份不可见 |
| 409 | 版本已存在且内容不同 |
| 410 | 下载已 yank 的版本 |
| 413 | 包超限 |
| 429 | 限流(一期不做,预留) |

---

## 8. 决策状态

已确认(2026-09-15):

- 租户由登录体系给出,本服务只存 `namespace` 做隔离键,不做租户管理
- 制作平台服务端发布,Bearer 发布令牌;制作平台自己保留技能源文件,本服务是发布副本
- 存储:PostgreSQL + 阿里云 OSS,走 S3 兼容 API,不用阿里 SDK
- 下载:返回临时 OSS 地址,包不经过本服务
- 规模:用户 k 级、技能 w 级

待领导拍板 ⚠️:

| # | 问题 | 本文假设 |
|---|---|---|
| 1 | 要不要审核 | 一期发布即上架;审核作为二期开关 |
| 2 | 存量 78 个技能与 GitHub hub 去向 | 一次性导入 `official` 为 `1.0.0`,GitHub 同步改为可选导入器 |
| 3 | 包大小 / 文件数 / 类型限制 | 30 MB / 300 个 / 禁可执行二进制 |
| 4 | 新建 Skill 的默认可见性 | `tenant` |

定了改本文,再动代码。
