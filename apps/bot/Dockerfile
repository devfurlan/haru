# Multi-stage build para o bot — alvo Railway
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /app

# --- deps stage: instala TODAS as deps do monorepo (camada cacheável) ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/database/package.json ./packages/database/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile

# --- build stage: estende deps (herda node_modules por-pacote do pnpm) ---
FROM deps AS build
COPY . .
# prisma generate só lê o schema; a DATABASE_URL real é injetada em runtime pelo Railway.
# A URL dummy só satisfaz a checagem de prisma.config.ts no build.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm --filter @haru/database generate
RUN pnpm --filter bot build

# --- runtime stage ---
FROM base AS runtime
ENV NODE_ENV=production
# node_modules da raiz (store .pnpm) + symlinks por-pacote, senão os imports
# externalizados pelo tsup (@sentry/node, fastify, @haru/database…) não resolvem.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/bot/node_modules ./apps/bot/node_modules
COPY --from=build /app/apps/bot/dist ./apps/bot/dist
COPY --from=build /app/apps/bot/package.json ./apps/bot/
COPY --from=build /app/packages ./packages
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

EXPOSE 3001
CMD ["node", "apps/bot/dist/index.js"]
