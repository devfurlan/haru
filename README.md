# haru

Plataforma de agendamento de horários e pagamentos via WhatsApp para negócios de serviços (barbearias, clínicas, podólogas, etc.).

## Estrutura do monorepo

```
haru/
├── apps/
│   ├── web/        # Next.js 16 - site público + área logada (dashboard)
│   └── bot/        # Fastify + OpenAI + Redis - webhook da WhatsApp Cloud API
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

| Estabelecimento | Email               | Senha      | Conteúdo seedado                                                                         |
| --------------- | ------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| Barbearia Teste | `admin@teste.local` | `haru1234` | 4 serviços (corte, barba, combo, sobrancelha) + horários seg-sex 9-12 / 13-18 + sáb 9-13 |

Pra zerar tudo e re-seedar: `pnpm supabase:reset` (derruba o stack, recria DB do zero e roda `db:local:setup`).

### Endpoints locais

| Serviço           | URL                                                     |
| ----------------- | ------------------------------------------------------- |
| Web               | http://localhost:4361                                   |
| Bot               | http://localhost:3001                                   |
| Supabase API      | http://127.0.0.1:54361                                  |
| Postgres          | postgresql://postgres:postgres@127.0.0.1:54362/postgres |
| Studio            | http://127.0.0.1:54363                                  |
| Inbucket (emails) | http://127.0.0.1:54364                                  |

Convenção de portas para coexistir com os outros projetos:

| Projeto  | API   | DB    | Studio | Inbucket |
| -------- | ----- | ----- | ------ | -------- |
| cuidly   | 54321 | 54322 | 54323  | 54324    |
| clicare  | 54331 | 54332 | 54333  | 54334    |
| cuidexa  | 54341 | 54342 | 54343  | 54344    |
| vitera   | 54351 | 54352 | 54353  | 54354    |
| **haru** | 54361 | 54362 | 54363  | 54364    |

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

### apps/web - Next.js 16

- App Router + React 19 (Server Components + Server Actions)
- Supabase Auth via `@supabase/ssr`
- Prisma 7 via `@haru/database`
- shadcn/ui + Tailwind CSS v4
- Rotas:
  - `/` - marketing
  - `/login`, `/signup` - auth (Supabase)
  - `/dashboard`, `/services`, `/schedule`, `/conversations`, `/settings` - área logada

### apps/bot - Fastify + OpenAI (espelha o bot da clicare)

- **Fastify** como HTTP framework
- **OpenAI Responses API** (`gpt-5`, encadeamento via `previous_response_id`)
- **Upstash Redis** - estado da conversa + buffer do debouncer (6s)
- **Prisma** via `@haru/database` (singleton)
- **Sentry** opcional
- WhatsApp Cloud API oficial, com validação HMAC sha256

**Multi-tenant nativo:** o webhook resolve qual Tenant atende cada mensagem via `metadata.phone_number_id`.

## Onboarding do WhatsApp (Embedded Signup + Coexistence)

O tenant conecta o WhatsApp em **Configurações → WhatsApp Business**. Há dois caminhos:

- **Embedded Signup (principal):** fluxo da Meta (`FB.login` com `config_id`) em
  [embedded-signup.tsx](<apps/web/src/app/(dashboard)/settings/embedded-signup.tsx>); a route
  [/api/whatsapp/embedded-signup](apps/web/src/app/api/whatsapp/embedded-signup/route.ts) troca o
  `code` por token, chama `subscribe_apps` na WABA do tenant e grava as credenciais. Dois modos:
  - **Coexistence (`coex`):** mesmo número que o dono já usa no **WhatsApp Business App** roda também
    na Cloud API. O dono continua atendendo pelo celular; o bot agenda por baixo. **Não** chama
    `register` (registrar quebraria a coexistence). Requisitos exibidos na UI: número nunca usado em
    API antes, ativo no Business App há 7+ dias, Business App 2.24.17+, abrir o app a cada 13 dias.
  - **Número novo (`new`):** registra o número na Cloud API (`register` com PIN de two-step).
- **Conexão manual (avançado):** formulário que cola `phone_number_id` / `access_token` / WABA -
  fallback quando o Embedded Signup não está configurado. Ambos os caminhos persistem via
  `saveWhatsappCredentials` ([whatsapp-credentials.ts](apps/web/src/lib/whatsapp-credentials.ts)).

**Campos de webhook a assinar na Meta** (App → WhatsApp → Configuração → Webhook fields):

- `messages` - mensagens dos clientes (caminho normal do bot).
- `smb_message_echoes` - **(coexistence)** mensagens que o **dono** envia pelo Business App.
  O bot consome isso em [webhook.ts](apps/bot/src/routes/webhook.ts) (`handleOwnerEcho`): registra a
  mensagem como `OUTBOUND` no histórico e **pausa o bot** para aquele cliente (handoff), pra o bot e
  o dono não responderem o mesmo cliente ao mesmo tempo.
- `history` / `smb_app_state_sync` - backfill de conversas e contatos do dono (**fase 2**, ainda não
  consumidos).

Envs novas (web): `NEXT_PUBLIC_FACEBOOK_APP_ID`, `NEXT_PUBLIC_WHATSAPP_CONFIG_ID`,
`FACEBOOK_APP_SECRET` (ver `apps/web/.env.example`). Um único `config_id` (Login do Facebook
para empresas → Configurações, variação **General** + permissões `whatsapp_business_management`
/ `whatsapp_business_messaging`) serve aos dois fluxos; coexistence vs número novo é decidido em
runtime pelo `featureType`.

## Templates da Meta (WhatsApp)

Mensagens iniciadas pelo negócio fora da janela de 24h de atendimento exigem **templates pré-aprovados na Meta** (WhatsApp Manager → _Modelos de mensagem_). Cada Tenant configura o nome e o idioma do template que ele mesmo criou e aprovou na conta dele; o nome é livre - os defaults abaixo são só sugestão exibida na UI. **Os parâmetros (`{{1}}`, `{{2}}`, …) têm que bater exatamente** com o que o código envia, na ordem listada, senão a Meta recusa o envio (e a falha é silenciosa: o lembrete/aviso simplesmente não chega).

Templates que o código envia hoje. O **corpo** é uma sugestão (texto que o negócio cola na Meta ao criar o template) - o que precisa ser idêntico é o **número e a ordem das variáveis**, não a redação.

### Lembrete de agendamento

- **Default do nome (UI):** `haru_appointment_reminder` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do cliente · `{{2}}` data/hora · `{{3}}` serviço
- **Enviado em:** [apps/bot/src/lib/reminders.ts](apps/bot/src/lib/reminders.ts)
- **Corpo sugerido:**
  > Oi, {{1}}! 👋 Passando pra lembrar do seu agendamento: 📅 {{2}} - ✂️ {{3}}. Se precisar remarcar ou cancelar, é só me chamar por aqui. Até lá!

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

- **Default do nome (UI):** _não tem_ (hoje só configurável por DB/seed) - sugestão: `haru_team_invite` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do negócio · `{{2}}` link de ativação
- **Enviado em:** [apps/web/src/lib/whatsapp-invite.ts](apps/web/src/lib/whatsapp-invite.ts)
- **Corpo sugerido:**
  > Olá! Você foi convidado para acessar o painel de _{{1}}_ no Demandaê. Ative sua conta e defina sua senha aqui: {{2}}

### Alertas ao dono (templates da PLATAFORMA)

Diferente dos de cima (cada Tenant cria os seus na conta dele), estes vivem na **WABA da própria plataforma Demandaê** e são enviados **pelo número da plataforma** pro WhatsApp do dono do estabelecimento - **nunca** pelo número do bot do Tenant (que é canal do cliente final). São **opt-in** (o dono liga em `/settings`, "Alertas de uso e cobrança por WhatsApp") e o envio fica **inativo (no-op logado)** até os templates serem aprovados na Meta e as envs preenchidas: `WHATSAPP_PLATFORM_PHONE_NUMBER_ID`, `WHATSAPP_PLATFORM_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_USAGE_ALERT`, `WHATSAPP_TEMPLATE_PAYMENT_FAILED`, `WHATSAPP_TEMPLATE_WEEKLY_REPORT`. Enquanto isso, o e-mail e a notificação in-app já cobrem o dono; o WhatsApp é reforço.

#### Alerta de uso - conversas do bot / addon (90% / 95% / 100%)

- **Nome (env `WHATSAPP_TEMPLATE_USAGE_ALERT`):** sugestão `demandae_usage_alert` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do negócio · `{{2}}` recurso (conversas do bot) · `{{3}}` percentual usado (ex.: `90%`)
- **Enviado em:** [apps/bot/src/lib/usageAlerts.ts](apps/bot/src/lib/usageAlerts.ts) (loop de uso, só para o eixo de **conversas do addon** - 90/95/100, nunca 85). A cota de **lembretes por WhatsApp** do plano base (alerta único em **80%**, pausa do canal em **100%**) avisa por **e-mail + banner**, não por este template.
- **Corpo sugerido:**
  > Oi! 👋 Você já usou {{3}} das suas {{2}} do plano em _{{1}}_ neste ciclo. Dá uma olhada nos planos quando puder pra ampliar a cota.

#### Cobrança falhou

- **Nome (env `WHATSAPP_TEMPLATE_PAYMENT_FAILED`):** sugestão `demandae_payment_failed` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do negócio · `{{2}}` link para atualizar o cartão
- **Enviado em:** [apps/web/src/app/api/webhooks/billing/asaas/route.ts](apps/web/src/app/api/webhooks/billing/asaas/route.ts) (via `onPaymentFailed`, junto do e-mail + in-app)
- **Corpo sugerido:**
  > Oi! Não confirmamos o pagamento da assinatura de _{{1}}_ e o acesso foi pausado. Regularize por aqui pra reativar o bot e o painel: {{2}}

#### Relatório semanal

- **Nome (env `WHATSAPP_TEMPLATE_WEEKLY_REPORT`):** sugestão `demandae_weekly_report` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do negócio · `{{2}}` faturamento da semana, já com o comparativo (ex.: `R$ 3.240 (+12% vs a semana passada)`) · `{{3}}` atendimentos + comparecimento (ex.: `44 atendimentos · 92% de comparecimento`) · `{{4}}` insight acionável (frase pronta, gerada por regra determinística) · `{{5}}` link do painel
- **Enviado em:** [apps/web/src/app/api/cron/weekly-report/route.ts](apps/web/src/app/api/cron/weekly-report/route.ts) (segunda 11:00 UTC = 08:00 BRT, via `onWeeklyReport`, junto do e-mail completo). Só sai se o dono deixou o relatório ligado com canal WhatsApp/Os dois em `/settings` **e** o opt-in de alertas do dono estiver ligado.
- **Corpo sugerido:**
  > 📊 Resumo da semana em _{{1}}_. Faturamento: {{2}}. Atendimentos: {{3}}. {{4}} Relatório completo: {{5}}

> **Categoria:** é `UTILITY` de verdade - o conteúdo é o dado do negócio do próprio dono, não oferta. Manter o corpo estático livre de "aproveite", "não perca", "promoção" e afins, senão a Meta reclassifica como `MARKETING`. Os parâmetros não podem conter quebra de linha nem 4+ espaços seguidos (por isso `{{4}}` é sempre uma frase de uma linha).

**Aprovação:** criar os três na conta WhatsApp Business **da plataforma** (WhatsApp Manager → _Modelos de mensagem_), categoria `UTILITY`, aguardar aprovação e preencher as envs acima. A aprovação em si não é feita nesta camada - só a lista + o envio env-gated ficam prontos.

### Transacional ao cliente pela PLATAFORMA (fallback do plano base)

No plano base o Tenant não tem WABA própria, então a saída transacional ao cliente final (lembrete, cancelamento, remarcação) sai **pelo número da plataforma** Demandaê, com os mesmos 3 parâmetros dos templates do Tenant. **Fallback aditivo:** quem tem WABA própria (variante OWN do addon) segue enviando pelo número dele; só quem não tem cai na plataforma. Env-gated: sem `WHATSAPP_PLATFORM_PHONE_NUMBER_ID` / `WHATSAPP_PLATFORM_ACCESS_TOKEN` + o template do evento, vira no-op (base fica só com e-mail/push - honesto com a arquitetura atual). Registrar/aprovar na WABA da plataforma, categoria `UTILITY`.

- **Lembrete** — env `WHATSAPP_TEMPLATE_REMINDER` · Idioma `pt_BR` · Enviado em [apps/bot/src/lib/reminders.ts](apps/bot/src/lib/reminders.ts)
- **Cancelamento** — env `WHATSAPP_TEMPLATE_CANCEL` · Idioma `pt_BR` · Enviado em [apps/web/src/lib/whatsapp-templates.ts](apps/web/src/lib/whatsapp-templates.ts)
- **Remarcação** — env `WHATSAPP_TEMPLATE_RESCHEDULE` · Idioma `pt_BR` · Enviado em [apps/web/src/lib/whatsapp-templates.ts](apps/web/src/lib/whatsapp-templates.ts)
- **Variáveis (nos três):** `{{1}}` nome do cliente · `{{2}}` data/hora · `{{3}}` serviço
- **Corpo sugerido (lembrete):**
  > Oi, {{1}}! Passando pra lembrar do seu horário: {{2}} · {{3}}. Até lá!

**Confirmação** (evento de criação) ainda **não** sai por WhatsApp - depende de criar o template de confirmação e ligar a flag `WHATSAPP_CONFIRMATION_ACTIVE` na copy de sucesso (`public-booking.tsx` / mobile). Hoje a confirmação sai por e-mail + área logada (app/web).

### Fila de espera (templates da PLATAFORMA ao cliente)

Enviados **pelo número da plataforma** Demandaê ao cliente da fila (quem entrou pela web ou não tem app; quem tem app recebe por push). Categoria `UTILITY` (aviso de disponibilidade - **sem** "aproveite/promoção/não perca"). Env-gated e fail-soft: sem `WHATSAPP_PLATFORM_PHONE_NUMBER_ID` / `WHATSAPP_PLATFORM_ACCESS_TOKEN` + o template do evento, vira no-op logado (o cliente fica só com push + área logada). Enviados em [apps/web/src/lib/waitlist.ts](apps/web/src/lib/waitlist.ts) via `sendPlatformWhatsapp`.

#### Vaga aberta (horário liberou)

- **Nome (env `WHATSAPP_TEMPLATE_WAITLIST_OPENING`):** sugestão `demandae_waitlist_opening` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do cliente · `{{2}}` dia (ex.: `sábado, 11/07`) · `{{3}}` profissional · `{{4}}` estabelecimento · `{{5}}` link de confirmação
- **Corpo sugerido:**
  > Oi, {{1}}! Abriu horário {{2}} com o {{3}} na {{4}}. Você tem alguns minutos pra garantir: {{5}}

#### Vaga garantida (confirmação da fila)

- **Nome (env `WHATSAPP_TEMPLATE_WAITLIST_CONFIRMED`):** sugestão `demandae_waitlist_confirmed` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` nome do cliente · `{{2}}` data/hora · `{{3}}` profissional
- **Corpo sugerido:**
  > Fechado, {{1}}! {{2}} com o {{3}}. Até lá!

Notas:

- **Fallback:** se o Tenant não tem template configurado, o código cai para texto livre - que **só entrega se o cliente falou com o número nas últimas 24h**. Por isso os templates são o caminho oficial.
- **Onde se configura:** nome + idioma de cada template ficam no model `Tenant` (`reminderTemplateName`/`Language`, `cancelTemplateName`/`Language`, `rescheduleTemplateName`/`Language`, `inviteTemplateName`/`Language` - ver [schema.prisma](packages/database/prisma/schema.prisma)). Os 3 de agendamento são editáveis no painel em `/settings`; o de convite hoje só por DB/seed.

> ⚠️ **Manutenção:** ao adicionar/alterar qualquer template (novo evento, mudança no número/ordem de parâmetros, no default do nome ou no corpo sugerido), **atualize esta seção na mesma alteração**.

### Assinatura de serviços - "Clube" (templates da PLATAFORMA ao cliente)

Enviados **pelo número da plataforma** Demandaê ao cliente final que assina um plano de serviços do estabelecimento (quem tem o app recebe por **push**; sem app cai no WhatsApp). Categoria `UTILITY` (transacional de cobrança/crédito - **sem** "aproveite/promoção"). Env-gated e fail-soft: sem `WHATSAPP_PLATFORM_PHONE_NUMBER_ID` / `WHATSAPP_PLATFORM_ACCESS_TOKEN` + o template do evento, vira no-op logado. Enviados em [apps/web/src/lib/comms/subscription-events.ts](apps/web/src/lib/comms/subscription-events.ts) via `sendPlatformWhatsapp`. O recibo de cobrança ("payment_ok") está **embutido** no de créditos renovados (uma mensagem por ciclo, não duas).

#### Assinatura ativada

- **Nome (env `WHATSAPP_TEMPLATE_CLUBSUB_ACTIVATED`):** sugestão `demandae_clubsub_activated` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` cliente · `{{2}}` plano · `{{3}}` estabelecimento · `{{4}}` créditos por mês
- **Corpo sugerido:**
  > Oi, {{1}}! Seu {{2}} na {{3}} está ativo. Você tem {{4}} crédito(s) este mês - é só agendar que desconta sozinho.

#### Créditos renovados (inclui recibo do mês)

- **Nome (env `WHATSAPP_TEMPLATE_CLUBSUB_CREDITS_RENEWED`):** sugestão `demandae_clubsub_credits_renewed` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` cliente · `{{2}}` créditos · `{{3}}` plano
- **Corpo sugerido:**
  > {{1}}, seus {{2}} crédito(s) do {{3}} chegaram. Bom pra mais um mês!

#### Pagamento falhou (atualizar cartão)

- **Nome (env `WHATSAPP_TEMPLATE_CLUBSUB_PAYMENT_FAILED`):** sugestão `demandae_clubsub_payment_failed` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` cliente · `{{2}}` plano · `{{3}}` estabelecimento · `{{4}}` link p/ atualizar o cartão
- **Corpo sugerido:**
  > {{1}}, não conseguimos cobrar seu {{2}} na {{3}}. Seus créditos ficam pausados até regularizar. Atualize seu cartão: {{4}}

#### Créditos acabando

- **Nome (env `WHATSAPP_TEMPLATE_CLUBSUB_CREDITS_LOW`):** sugestão `demandae_clubsub_credits_low` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` cliente · `{{2}}` créditos restantes · `{{3}}` plano
- **Corpo sugerido:**
  > {{1}}, resta {{2}} crédito(s) do seu {{3}} este mês. Eles renovam no próximo ciclo.

#### Créditos vencendo (só planos sem acúmulo)

- **Nome (env `WHATSAPP_TEMPLATE_CLUBSUB_CREDITS_EXPIRING`):** sugestão `demandae_clubsub_credits_expiring` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` cliente · `{{2}}` créditos · `{{3}}` data de vencimento
- **Corpo sugerido:**
  > {{1}}, você tem {{2}} crédito(s) que vencem em {{3}}. Aproveite antes que o ciclo renove.

#### Assinatura cancelada

- **Nome (env `WHATSAPP_TEMPLATE_CLUBSUB_CANCELED`):** sugestão `demandae_clubsub_canceled` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` cliente · `{{2}}` plano · `{{3}}` data fim do acesso
- **Corpo sugerido:**
  > {{1}}, cancelamos seu {{2}}. Seus créditos valem até {{3}} - dá pra usar o que sobrou. Volte quando quiser.

O DONO é avisado dos eventos de assinante (novo assinante, cancelou, pagamento falhou) **só in-app** (sino do painel, model `Notification`) - sem WhatsApp por ora (reforço opt-in futuro, análogo aos alertas de uso).

> ⚠️ **Manutenção:** mesma regra - alterou template/parâmetro/corpo, atualiza aqui na mesma mudança.

### Convite de avaliação (template da PLATAFORMA ao cliente)

Enviado **pelo número da plataforma** Demandaê ~1h após o fim do atendimento (`REVIEW_INVITE_DELAY_HOURS` em [apps/web/src/lib/comms/review-invite.ts](apps/web/src/lib/comms/review-invite.ts)), pelo cron [/api/cron/review-invites](apps/web/src/app/api/cron/review-invites/route.ts). Quem tem o app recebe por **push** (abre a tela nativa de avaliar); sem app cai no WhatsApp; e-mail sempre. Categoria `UTILITY` (pergunta sobre o próprio atendimento - **sem** "aproveite/promoção"). Env-gated e fail-soft: sem `WHATSAPP_PLATFORM_PHONE_NUMBER_ID` / `WHATSAPP_PLATFORM_ACCESS_TOKEN` + o template, vira no-op logado (push + e-mail cobrem). Só convida uma vez por atendimento e nunca quem já avaliou o estabelecimento; respeita o opt-out de lembretes (`Contact.remindersOptOutAt`).

#### Como foi seu atendimento?

- **Nome (env `WHATSAPP_TEMPLATE_REVIEW_INVITE`):** sugestão `demandae_review_invite` · **Idioma:** `pt_BR` · **Categoria Meta:** `UTILITY`
- **Variáveis:** `{{1}}` cliente · `{{2}}` serviço · `{{3}}` estabelecimento · `{{4}}` link para avaliar
- **Corpo sugerido:**
  > Oi, {{1}}! Como foi seu {{2}} na {{3}}? Conta rapidinho, leva 10 segundos e ajuda outras pessoas: {{4}}

> ⚠️ **Manutenção:** mesma regra - alterou template/parâmetro/corpo, atualiza aqui na mesma mudança.

## Deploy

- **web** → Vercel
- **bot** → Railway (Dockerfile multi-stage em `apps/bot/Dockerfile`)
- **db / auth / storage** → Supabase hospedado
- **redis** → Upstash
- **observabilidade** → Sentry (opcional)
