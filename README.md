# haru

Plataforma de agendamento de horários e pagamentos via WhatsApp para negócios de serviços (barbearias, clínicas, podólogas, etc.).

## Estrutura do monorepo

```
haru/
├── apps/
│   ├── web/        # Next.js 16 — site público + área logada (dashboard)
│   └── bot/        # Fastify + OpenAI + Redis — webhook da WhatsApp Cloud API
├── packages/
│   ├── database/        # Prisma 7 (driver adapter @prisma/adapter-pg)
│   ├── ui/              # Componentes compartilhados (shadcn)
│   ├── eslint-config/
│   └── typescript-config/
├── supabase/       # Stack local (Postgres + Auth + Studio + Storage)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Setup local

Pré-requisitos:

- Node 20+, pnpm 9+
- Docker rodando (necessário pro `supabase start`)

```bash
# 1. Instalar deps
pnpm install

# 2. Copiar .env.example pra .env de cada projeto (cada app tem o seu)
cp apps/web/.env.example          apps/web/.env.local
cp apps/bot/.env.example          apps/bot/.env
cp packages/database/.env.example packages/database/.env

# 3. Subir stack local do Supabase (Postgres + Auth + Studio + Storage + Inbucket)
pnpm supabase:start

# 4. Aplicar schema do Prisma no banco local + seedar dados de teste
pnpm db:local:setup

# 5. Rodar web + bot
pnpm dev
```

Cada projeto tem o seu `.env.example` listando só o que aquele projeto realmente consome:

- `apps/web/.env.example` → `.env.local` (Next.js lê automaticamente)
- `apps/bot/.env.example` → `.env` (carregado via `tsx --env-file=.env`)
- `packages/database/.env.example` → `.env` (carregado via `dotenv -e .env` nos scripts do Prisma)

Atalho equivalente aos passos 3-5 (após criar os `.env`):

```bash
pnpm dev:local   # supabase start + turbo dev
```

### Usuários de teste (criados pelo seed)

Após `pnpm db:local:setup`, esses usuários ficam disponíveis em `http://localhost:4361/login`:

| Estabelecimento  | Email               | Senha     | Conteúdo seedado |
|------------------|---------------------|-----------|------------------|
| Barbearia Teste  | `admin@teste.local` | `haru1234` | 4 serviços (corte, barba, combo, sobrancelha) + horários seg-sex 9-12 / 13-18 + sáb 9-13 |

Pra zerar tudo e re-seedar: `pnpm supabase:reset` (derruba o stack, recria DB do zero e roda `db:local:setup`).

### Endpoints locais

| Serviço      | URL                          |
|--------------|------------------------------|
| Web          | http://localhost:4361        |
| Bot          | http://localhost:3001        |
| Supabase API | http://127.0.0.1:54361       |
| Postgres     | postgresql://postgres:postgres@127.0.0.1:54362/postgres |
| Studio       | http://127.0.0.1:54363       |
| Inbucket (emails) | http://127.0.0.1:54364  |

Convenção de portas para coexistir com os outros projetos:

| Projeto   | API   | DB    | Studio | Inbucket |
|-----------|-------|-------|--------|----------|
| cuidly    | 54321 | 54322 | 54323  | 54324    |
| clicare   | 54331 | 54332 | 54333  | 54334    |
| cuidexa   | 54341 | 54342 | 54343  | 54344    |
| vitera    | 54351 | 54352 | 54353  | 54354    |
| **haru**  | 54361 | 54362 | 54363  | 54364    |

### Comandos do Supabase

```bash
pnpm supabase:start    # sobe o stack
pnpm supabase:stop     # derruba (preserva volumes/dados)
pnpm supabase:status   # mostra URLs e chaves do stack rodando
pnpm supabase:reset    # zera tudo + recria schema (perde dados locais)
```

### Comandos de banco

```bash
pnpm db:push           # aplica o schema do Prisma no DB local (sem migration)
pnpm db:migrate        # cria uma nova migration (a partir do schema)
pnpm db:studio         # abre Prisma Studio
pnpm db:generate       # regenera o cliente
```

## Stack

### apps/web — Next.js 16

- App Router + React 19 (Server Components + Server Actions)
- Supabase Auth via `@supabase/ssr`
- Prisma 7 via `@haru/database`
- shadcn/ui + Tailwind CSS v4
- Rotas:
  - `/` — marketing
  - `/login`, `/signup` — auth (Supabase)
  - `/dashboard`, `/services`, `/schedule`, `/conversations`, `/settings` — área logada

### apps/bot — Fastify + OpenAI (espelha o bot da clicare)

- **Fastify** como HTTP framework
- **OpenAI Responses API** (`gpt-5`, encadeamento via `previous_response_id`)
- **Upstash Redis** — estado da conversa + buffer do debouncer (6s)
- **Prisma** via `@haru/database` (singleton)
- **Sentry** opcional
- WhatsApp Cloud API oficial, com validação HMAC sha256

**Multi-tenant nativo:** o webhook resolve qual Tenant atende cada mensagem via `metadata.phone_number_id`.

## Templates da Meta (WhatsApp)

Mensagens iniciadas pelo negócio fora da janela de 24h de atendimento exigem **templates pré-aprovados na Meta** (WhatsApp Manager → _Modelos de mensagem_). Cada Tenant configura o nome e o idioma do template que ele mesmo criou e aprovou na conta dele; o nome é livre — os defaults abaixo são só sugestão exibida na UI. **Os parâmetros (`{{1}}`, `{{2}}`, …) têm que bater exatamente** com o que o código envia, na ordem listada, senão a Meta recusa o envio (e a falha é silenciosa: o lembrete/aviso simplesmente não chega).

Templates que o código envia hoje. O **corpo** é uma sugestão (texto que o negócio cola na Meta ao criar o template) — o que precisa ser idêntico é o **número e a ordem das variáveis**, não a redação.

### Lembrete de agendamento

- **Default do nome (UI):** `haru_appointment_reminder` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do cliente · `{{2}}` data/hora · `{{3}}` serviço
- **Enviado em:** [apps/bot/src/lib/reminders.ts](apps/bot/src/lib/reminders.ts)
- **Corpo sugerido:**
  > Oi, {{1}}! 👋 Passando pra lembrar do seu agendamento: 📅 {{2}} — ✂️ {{3}}. Se precisar remarcar ou cancelar, é só me chamar por aqui. Até lá!

### Cancelamento

- **Default do nome (UI):** `haru_appointment_canceled` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do cliente · `{{2}}` data/hora · `{{3}}` serviço
- **Enviado em:** [apps/web/src/lib/whatsapp-templates.ts](apps/web/src/lib/whatsapp-templates.ts)
- **Corpo sugerido:**
  > Oi, {{1}}. Seu agendamento de {{3}} em {{2}} foi cancelado. Se quiser remarcar, é só me chamar por aqui que a gente encontra um novo horário. 🗓️

### Remarcação

- **Default do nome (UI):** `haru_appointment_rescheduled` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do cliente · `{{2}}` **nova** data/hora · `{{3}}` serviço
- **Enviado em:** [apps/web/src/lib/whatsapp-templates.ts](apps/web/src/lib/whatsapp-templates.ts)
- **Corpo sugerido:**
  > Oi, {{1}}! ✅ Seu agendamento de {{3}} foi remarcado. Novo horário: 📅 {{2}}. Qualquer coisa é só responder por aqui. Até lá!

### Convite de equipe

- **Default do nome (UI):** _não tem_ (hoje só configurável por DB/seed) — sugestão: `haru_team_invite` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do negócio · `{{2}}` link de ativação
- **Enviado em:** [apps/web/src/lib/whatsapp-invite.ts](apps/web/src/lib/whatsapp-invite.ts)
- **Corpo sugerido:**
  > Olá! Você foi convidado para acessar o painel de *{{1}}* no Demandaê. Ative sua conta e defina sua senha aqui: {{2}}

Notas:

- **Fallback:** se o Tenant não tem template configurado, o código cai para texto livre — que **só entrega se o cliente falou com o número nas últimas 24h**. Por isso os templates são o caminho oficial.
- **Onde se configura:** nome + idioma de cada template ficam no model `Tenant` (`reminderTemplateName`/`Language`, `cancelTemplateName`/`Language`, `rescheduleTemplateName`/`Language`, `inviteTemplateName`/`Language` — ver [schema.prisma](packages/database/prisma/schema.prisma)). Os 3 de agendamento são editáveis no painel em `/settings`; o de convite hoje só por DB/seed.

> ⚠️ **Manutenção:** ao adicionar/alterar qualquer template (novo evento, mudança no número/ordem de parâmetros, no default do nome ou no corpo sugerido), **atualize esta seção na mesma alteração**.

## Deploy

- **web** → Vercel
- **bot** → Railway (Dockerfile multi-stage em `apps/bot/Dockerfile`)
- **db / auth / storage** → Supabase hospedado
- **redis** → Upstash
- **observabilidade** → Sentry (opcional)
