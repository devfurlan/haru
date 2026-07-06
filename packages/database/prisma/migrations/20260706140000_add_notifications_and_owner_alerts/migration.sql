-- Centro de notificações in-app (sino do painel) + opt-in de alertas por WhatsApp pro
-- dono + marcador de lembrete de renovação (dedup do cron). Tudo ADITIVO e idempotente
-- (IF NOT EXISTS / guards) para nunca travar deploy nem reaplicação.

-- Canal da notificação in-app (enum novo). CREATE TYPE não tem IF NOT EXISTS -> guard.
DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('ACCOUNT', 'PRODUCT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Opt-in do dono a receber alertas (uso/cobrança) por WhatsApp no número da plataforma.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ownerWhatsappAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Marca quando o lembrete de renovação (7d antes) já saiu neste ciclo. Resetado a null
-- na renovação (webhook ACTIVE) pra rearmar no ciclo seguinte.
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "renewalReminderSentAt" TIMESTAMP(3);
