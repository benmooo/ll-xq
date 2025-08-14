FROM oven/bun:latest AS base

WORKDIR /app
COPY package.json ./
RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
