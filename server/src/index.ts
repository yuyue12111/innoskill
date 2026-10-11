import { S3Client } from "@aws-sdk/client-s3";
import { serve } from "@hono/node-server";
import { Redis } from "ioredis";
import { pino } from "pino";
import { createPrismaClient } from "./adapters/pg/prisma.js";
import { createPgDatabase } from "./adapters/pg/repositories.js";
import { createPgSearchIndex } from "./adapters/pg/searchIndex.js";
import { createS3ObjectStorage } from "./adapters/s3/objectStorage.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { systemClock } from "./ports/clock.js";

const config = loadConfig();
const logger = pino({ level: config.LOG_LEVEL });

const prisma = createPrismaClient(config.DATABASE_URL);
const s3 = new S3Client({
  region: config.S3_REGION,
  endpoint: config.S3_ENDPOINT,
  forcePathStyle: config.S3_FORCE_PATH_STYLE,
  credentials:
    config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY
      ? { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY }
      : undefined,
});
const redis = new Redis(config.REDIS_URL);
redis.on("error", (err) => logger.error({ err }, "redis error"));

const app = createApp(
  {
    db: createPgDatabase(prisma),
    storage: createS3ObjectStorage(s3, config.S3_BUCKET),
    searchIndex: createPgSearchIndex(prisma),
    clock: systemClock,
    logger,
  },
  redis,
);

serve({ fetch: app.fetch, port: config.PORT }, (info) => logger.info(`listening on :${info.port}`));

// OTel 预加载注册了 SIGTERM 处理器但不退出进程,这里恢复默认行为,否则 docker stop 要等到强杀
process.on("SIGTERM", () => process.exit(0));
