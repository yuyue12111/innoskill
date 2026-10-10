# innoskill

技能分发平台 MVP。设计以 `docs/` 下 01–04、06 为准；**接口文档 03 是前后端唯一契约，接口变更先改 03 再改代码。**

## 目录

| 路径 | 内容 |
|---|---|
| `server/` | 后端：Hono + Prisma 7 + PostgreSQL + S3（AWS SDK） |
| `web/` | 前端：Vite + React |

两者各有独立的 `package.json` 和工具配置；根目录不放构建配置。

## 约定

- **MVP**：只做文档要求的范围，不加超范围的防御设计；要加边界处理先问。
- **后端多态**：禁用 class + 继承。用 `interface` + 工厂函数（`createXxx(deps): Port`），自己的代码不写 class；错误用单一类型 + `code` 字段，不建继承树。第三方库自带的 class 照常用。
- **Prisma 7** 与 6 有破坏性差异，不要用 6 的写法。
