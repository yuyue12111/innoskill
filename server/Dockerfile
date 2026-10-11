FROM node:24-slim
WORKDIR /app

# Prisma CLI(建表用)依赖 OpenSSL,slim 镜像没带
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# 先装依赖(postinstall 会 prisma generate,需要 schema 和 config)
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
# 启动前建表 / 升级表结构;exec 让 node 成为 1 号进程,docker stop 的 SIGTERM 能直接到达
CMD ["sh", "-c", "npx prisma migrate deploy && exec node --import ./otel.mjs dist/index.js"]
