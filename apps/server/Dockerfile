FROM oven/bun:latest AS base

WORKDIR /app
COPY package.json ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun build index.ts --outfile dist/index.js --target bun

FROM oven/bun:latest
WORKDIR /app

COPY --from=builder /app/dist/index.js ./index.js

# 暴露端口
EXPOSE 3000

# 启动
CMD ["bun", "index.js"]
