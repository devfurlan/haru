-- Relatório semanal do dono: resumo da semana anterior enviado na segunda de manhã
-- (e-mail completo + resumo por WhatsApp). Config por tenant + marcador de dedup do envio.
-- Vale em todos os planos - é retenção, não capa de plano.
-- Idempotente (IF NOT EXISTS / DO-block) para nunca travar em re-aplicação.

-- Canais do relatório.
DO $$ BEGIN
  CREATE TYPE "WeeklyReportChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'BOTH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Config por tenant. Default ligado + os dois canais (o WhatsApp ainda depende do opt-in
-- ownerWhatsappAlertsEnabled + o OWNER ter telefone; sem isso, só o e-mail sai).
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "weeklyReportEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "weeklyReportChannel" "WeeklyReportChannel" NOT NULL DEFAULT 'BOTH';

-- Dedup: "YYYY-MM-DD" da segunda da última semana já relatada, carimbado DEPOIS do envio.
-- Null = nunca enviado. Retry do cron (500 na Vercel) não duplica o relatório.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "weeklyReportSentForWeek" TEXT;
