import { createMiddleware } from "hono/factory";
import type { Requester } from "../domain/model.js";

export type AppEnv = { Variables: { requester: Requester } };

/** 读网关注入的 X-User-Id;平台自身不解析 JWT,没有该头即匿名(03 §1.2) */
export const identity = createMiddleware<AppEnv>(async (c, next) => {
  const userId = c.req.header("x-user-id")?.trim();
  c.set("requester", userId ? { userId } : null);
  await next();
});
