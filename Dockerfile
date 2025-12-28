FROM oven/bun:1.1.38-alpine AS build

RUN apk add --no-cache git nodejs npm \
  && npm install -g pnpm@10.26.2

WORKDIR /app

ENV PNPM_STORE_DIR=/app/.pnpm-store

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY patches ./patches
COPY apps/service-bun/package.json apps/service-bun/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/integrations/package.json packages/integrations/package.json
COPY packages/rpc/package.json packages/rpc/package.json

RUN pnpm install --frozen-lockfile

COPY apps ./apps
COPY packages ./packages

RUN pnpm -r --filter ./packages/* run build
RUN pnpm prune --prod

FROM oven/bun:1.1.38-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app /app

RUN apk add --no-cache curl \
  && addgroup -S app \
  && adduser -S -G app app \
  && mkdir -p /app/data \
  && chown -R app:app /app

USER app

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8787/health >/dev/null || exit 1

CMD ["bun", "apps/service-bun/src/main.ts"]
