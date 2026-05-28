# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack & layout

Monorepo pnpm + Turborepo. WhatsApp scheduling platform for service businesses (PT-BR product). Two apps share a single Prisma schema and Supabase project.

- `apps/web` — Next.js 16 (App Router, React 19, Turbopack, Tailwind v4, shadcn/ui). Supabase Auth via `@supabase/ssr`. Route groups: `(marketing)`, `(auth)`, `(dashboard)`.
- `apps/bot` — Fastify + Node 20, OpenAI Responses API (`gpt-5`, chained via `previous_response_id`), Upstash Redis for conversation state, WhatsApp Cloud API webhook with HMAC sha256 validation. Deployed to Railway via `apps/bot/Dockerfile`.
- `packages/database` — Prisma 7 client (driver adapter `@prisma/adapter-pg`) re-exported as `@haru/database`. **Single source of truth for DB schema** — Supabase CLI migrations are disabled (`[db.migrations] enabled = false` in `supabase/config.toml`); always use `prisma migrate` / `db:push`.
- `packages/ui` — shared shadcn components (`@haru/ui`).
- `packages/eslint-config`, `packages/typescript-config` — shared configs.

## Commands

All from repo root unless noted. `.env` at root is loaded by every workspace via `dotenv -e ../../.env` or `--env-file=../../.env`.

```bash
pnpm dev                  # turbo dev (web + bot, both watch)
pnpm dev:local            # supabase start + turbo dev
pnpm build / lint / typecheck / format

# Single-app variants
pnpm --filter web dev     # next dev --turbopack on :3000
pnpm --filter bot dev     # fastify on :3001 (tsx watch)
pnpm --filter bot tunnel  # ngrok :3001 (for Meta webhook in dev)

# DB (Prisma drives the schema; Supabase CLI does not)
pnpm db:push              # apply schema to local Postgres (no migration)
pnpm db:migrate           # create+apply a dev migration
pnpm db:generate          # regenerate client
pnpm db:studio
pnpm db:local:setup       # generate + push (used after supabase:reset)

# Supabase local stack (docker)
pnpm supabase:start / :stop / :status
pnpm supabase:reset       # wipe + restart + re-apply Prisma schema
```

No test runner is wired up — `pnpm test` does not exist. Don't claim tests pass; say so explicitly.

## Local ports

Non-standard to coexist with sibling projects (cuidly/clicare/cuidexa/vitera). Use these, not Supabase defaults:

| Service       | Port  |
| ------------- | ----- |
| Web           | 3000  |
| Bot           | 3001  |
| Supabase API  | 54361 |
| Postgres      | 54362 |
| Studio        | 54363 |
| Inbucket (email catch-all) | 54364 |

## Architecture notes

### Multi-tenancy

Every domain model is keyed by `tenantId` (see `packages/database/prisma/schema.prisma`). The bot is multi-tenant by `phone_number_id`: each `Tenant` row owns a `whatsappPhoneNumberId` (set during Meta Embedded Signup), and `findTenantByPhoneNumberId` in [apps/bot/src/services/tenantService.ts](apps/bot/src/services/tenantService.ts) is the entry router — webhooks for unknown phone numbers are dropped. Web users link to a tenant via `User.authId` ↔ Supabase `auth.users.id` ↔ `User.tenantId`.

### Auth flow (web)

`User` in Postgres is created **in the same transaction** as `Tenant` during signup. This depends on `[auth.email] enable_confirmations = false` in `supabase/config.toml` (sessions issued immediately on signup, no email click). If you re-enable confirmations, the signup action will create an orphan `auth.users` row with no `User`/`Tenant`.

Use [apps/web/src/lib/auth.ts](apps/web/src/lib/auth.ts):
- `getAuthUser()` — Supabase auth user only.
- `getCurrentUserAndTenant()` — joins Prisma `User` + `Tenant`, returns null if either side is missing.
- `requireUserAndTenant()` — same but redirects to `/login`. **Use this in protected server components / server actions.**

Middleware ([apps/web/src/middleware.ts](apps/web/src/middleware.ts)) refreshes Supabase session cookies on every non-static request.

### Bot message pipeline

[apps/bot/src/routes/webhook.ts](apps/bot/src/routes/webhook.ts) is the entry:

1. `application/json` is parsed as a `Buffer` (raw body) so HMAC sha256 can be verified against `WHATSAPP_APP_SECRET`. **Do not register a global JSON body parser** — it would replace the buffer parser and break signature verification.
2. Webhook responds `200 OK` immediately and processes async (Meta will retry on slow responses).
3. In-memory `processedMessages` Set deduplicates Meta retries (bounded at 1000 entries).
4. Active flow stored in Redis (`getConversation` / `setConversation`); flows currently implemented: `menu`, `scheduling`.
5. Messages inside an active flow are debounced 6 s in Redis ([apps/bot/src/lib/messageDebouncer.ts](apps/bot/src/lib/messageDebouncer.ts)) so rapid bursts ("oi"·"tudo bem?"·"queria agendar") are joined with `\n` and sent to the LLM as one turn. The buffer survives process restarts (Upstash Redis); the timer does not.
6. Media types (audio/image/video/document/sticker) are currently dropped — see `// TODO: ingestão de mídia`.

OpenAI calls go through `apps/bot/src/lib/openai/responses.ts` (Responses API, chained with `previous_response_id`); prompts live in `apps/bot/src/lib/openai/prompts/`.

### Prisma client singleton

`@haru/database` (see [packages/database/src/index.ts](packages/database/src/index.ts)) exposes a `globalThis`-cached `PrismaClient` with the pg driver adapter. Import `prisma` from `@haru/database` everywhere — both apps do. Don't `new PrismaClient()` directly; you'll fan out connections in dev under tsx-watch / Next HMR.

`packages/database/prisma.config.ts` deliberately reads `process.env.DATABASE_URL` instead of using Prisma's `env()` helper, because `env()` resolves relative to `packages/database` and ignores the root `.env`. All Prisma scripts run via `dotenv -e ../../.env --`.

### Supabase Storage buckets

Defined in [supabase/config.toml](supabase/config.toml):
- `bot-media` (private, 25 MiB) — inbound WhatsApp media.
- `tenant-assets` (public, 5 MiB, images only) — tenant logos/cover images.

## Conventions

- Code comments and product copy in PT-BR; identifiers in English (`Tenant`, `Appointment`, `scheduleBlocks`).
- Prettier: single quotes, semicolons, trailing commas, 100-col, 2-space indent, `prettier-plugin-tailwindcss` enabled.
- Node ≥ 20, pnpm ≥ 9 (enforced by `engines`). `.nvmrc` pins 20.
- ESLint uses `only-warn` (no errors) — `pnpm lint` will not fail the build on style.
- `ScheduleBlock.weekday`: `0 = Sunday`, `6 = Saturday` (matches `Date#getDay()`). `startMinute`/`endMinute` are minutes since midnight.
- Times stored as `DateTime` (UTC) in Postgres; tenant-local interpretation uses `Tenant.timezone` (default `America/Sao_Paulo`).
