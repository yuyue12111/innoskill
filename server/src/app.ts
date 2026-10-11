import { Hono } from "hono";
import { createErrorHandler } from "./middleware/errorHandler.js";
import { identity, type AppEnv } from "./middleware/identity.js";
import { createRateLimiter, type Counter } from "./middleware/rateLimit.js";
import { createSkillRoutes } from "./routes/skills.js";
import type { Deps } from "./usecases/deps.js";

export function createApp(deps: Deps, counter: Counter): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use(async (c, next) => {
    const start = performance.now();
    await next();
    deps.logger.info(
      {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        ms: Math.round(performance.now() - start),
        userId: c.get("requester")?.userId ?? null,
      },
      "request",
    );
  });
  app.use(identity);
  app.onError(createErrorHandler(deps.logger));
  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "route not found" } }, 404));

  app.route("/api/skills", createSkillRoutes(deps, createRateLimiter(counter)));
  return app;
}
