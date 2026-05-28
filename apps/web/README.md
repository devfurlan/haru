# web

Next.js 16 (App Router, Turbopack, React 19). Contém:

- **`(marketing)`** — site público: home, blog, landing pages
- **`(dashboard)`** — área logada do cliente (conversas do bot, horários, serviços)
- **`/login`** — fluxo de autenticação via Supabase

## Dev

```bash
pnpm --filter web dev
```

Sobe em `http://localhost:4361`.

## Stack

- Next.js 16 + React 19
- Supabase (Auth + Postgres) via `@supabase/ssr`
- Prisma via `@haru/database` (workspace)
- shadcn/ui + Tailwind CSS v4
- Componentes compartilhados em `@haru/ui`

## Variáveis de ambiente

Ver `.env.example` na raiz do monorepo.
