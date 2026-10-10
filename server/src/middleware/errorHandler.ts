import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Logger } from "pino";
import { isAppError, type ErrorCode } from "../domain/errors.js";
import type { AppEnv } from "./identity.js";

// 找不到返回 400 而不是 404,六个接口统一(03 §1.3)
const STATUS: Record<ErrorCode, ContentfulStatusCode> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function createErrorHandler(logger: Logger): ErrorHandler<AppEnv> {
  return (err, c) => {
    if (isAppError(err)) {
      if (err.code === "INTERNAL") logger.error({ err }, err.message);
      const body = { code: err.code, message: err.message, ...(err.details && { details: err.details }) };
      return c.json({ error: body }, STATUS[err.code]);
    }
    // Hono 自身抛的 4xx(如请求体格式错误)统一按参数非法处理
    if (err instanceof HTTPException && err.status < 500) {
      return c.json({ error: { code: "BAD_REQUEST", message: err.message } }, 400);
    }
    logger.error({ err }, "unhandled error");
    return c.json({ error: { code: "INTERNAL", message: "internal server error" } }, 500);
  };
}
