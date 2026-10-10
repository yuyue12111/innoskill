import type { Context, MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { rateLimited } from "../domain/errors.js";
import type { AppEnv } from "./identity.js";

/** Redis 里用到的两个命令;ioredis 实例直接满足 */
export interface Counter {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

/** 每分钟额度;anonymous 为 null 表示该接口要求登录,匿名请求交给接口自己返回 401 */
export interface Limit {
  anonymous: number | null;
  user: number;
}

export type RateLimiter = (name: string, limit: Limit) => MiddlewareHandler<AppEnv>;

/** 固定窗口计数,已登录按 user_id、匿名按 IP 计(03 §1.4) */
export function createRateLimiter(counter: Counter): RateLimiter {
  return (name, limit) =>
    createMiddleware<AppEnv>(async (c, next) => {
      const requester = c.get("requester");
      const max = requester ? limit.user : limit.anonymous;
      if (max !== null) {
        const who = requester ? `u:${requester.userId}` : `ip:${clientIp(c)}`;
        const key = `rl:${name}:${who}:${Math.floor(Date.now() / 60_000)}`;
        const count = await counter.incr(key);
        if (count === 1) await counter.expire(key, 60);
        if (count > max) throw rateLimited();
      }
      await next();
    });
}

const clientIp = (c: Context) =>
  c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
