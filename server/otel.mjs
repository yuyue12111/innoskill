// npm start 的链路追踪预加载。先注册 ESM 钩子,ESM 里 import 的 pino / ioredis 才会被埋点(日志也才带 trace_id);
// 再启动 OTel 自动埋点,导出方式由 OTEL_* 环境变量控制。
import { register } from "node:module";

register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);
await import("@opentelemetry/auto-instrumentations-node/register");
