# bot

Serviço HTTP (Fastify + Node 20, TypeScript) que recebe webhooks da **WhatsApp Cloud API** oficial da Meta, persiste mensagens via `@haru/database`, mantém estado de conversa no **Upstash Redis** e responde via **OpenAI Responses API**.

Espelha a arquitetura do bot da clicare. **Multi-tenant**: cada tenant tem seu próprio `phone_number_id` (onboarded via Embedded Signup), e o webhook resolve qual tenant atende cada mensagem.

## Estrutura

```
src/
├── index.ts                # bootstrap Fastify + Sentry + heartbeat
├── instrument.ts           # Sentry init
├── routes/
│   └── webhook.ts          # WhatsApp webhook (GET verify + POST com HMAC)
├── flows/
│   ├── menu.ts             # boas-vindas + botões iniciais
│   └── scheduling.ts       # agendamento conduzido por LLM
├── services/
│   ├── tenantService.ts    # resolve Tenant por phone_number_id
│   └── chatHistoryService.ts  # Contact + Conversation + Message
└── lib/
    ├── env.ts              # validação de envs (getters required())
    ├── prisma.ts           # re-export do singleton @haru/database
    ├── supabase.ts         # cliente Supabase (Storage etc.)
    ├── redis.ts            # Upstash + ConversationState
    ├── messageDebouncer.ts # buffer Redis + debounce de 6s
    ├── heartbeat.ts        # ping em Healthchecks (opcional)
    ├── whatsapp/
    │   ├── client.ts       # Graph API + verifyWebhookSignature
    │   ├── safeSend.ts     # envio com retry + captura Sentry
    │   └── types.ts        # tipos do webhook
    └── openai/
        ├── responses.ts    # askBot() via Responses API
        └── prompts/
            ├── index.ts    # BOT_MODEL + re-exports
            ├── scheduler.ts # agente principal
            └── shared/{persona,safety}.ts
```

## Dev

```bash
pnpm --filter bot dev
```

Sobe em `http://localhost:3001`. Endpoints:

- `GET /health`
- `GET /webhook` — verificação Meta (hub.challenge)
- `POST /webhook` — recebimento de mensagens (validação HMAC sha256)

Para expor pra Meta em desenvolvimento, use ngrok:

```bash
pnpm --filter bot tunnel
```

## Deploy (Railway)

Dockerfile multi-stage em `apps/bot/Dockerfile`; `railway.json` aponta pra ele.

```bash
railway up
```

## Variáveis de ambiente

Ver `.env.example` na raiz do monorepo. As essenciais:

- `DATABASE_URL` — Postgres Supabase
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_PLATFORM_ACCESS_TOKEN`
- `OPENAI_API_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- `BOT_INTERNAL_TOKEN`
- `PORT` (default `3001`)
- `SENTRY_DSN`, `HEALTHCHECKS_URL` (opcionais)
