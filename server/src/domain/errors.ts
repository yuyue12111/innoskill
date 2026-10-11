// 单一错误类型 + code,不建继承树。code → HTTP 的映射见 03 §1.3。

export type ErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INTERNAL";

export type AppError = Error & {
  name: "AppError";
  code: ErrorCode;
  details?: Record<string, unknown>;
};

export function appError(code: ErrorCode, message: string, details?: Record<string, unknown>): AppError {
  return Object.assign(new Error(message), { name: "AppError" as const, code, details });
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof Error && err.name === "AppError" && "code" in err;
}

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  appError("BAD_REQUEST", message, details);
export const notFound = (message: string) => appError("NOT_FOUND", message);
export const unauthorized = (message = "authentication required") => appError("UNAUTHORIZED", message);
export const forbidden = (message = "forbidden") => appError("FORBIDDEN", message);
export const rateLimited = () => appError("RATE_LIMITED", "rate limit exceeded");
