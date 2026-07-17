-- Log de canal por comms (own-channels-first): uma linha por disparo com o canal PRIMÁRIO,
-- pra medir "% dos comms que saiu por push/email vs WhatsApp" e validar a redução de WhatsApp.
-- Idempotente (IF NOT EXISTS / DO-block) para nunca travar em re-aplicação.

-- Canal primário de um comms (hierarquia own-channels-first: PUSH > EMAIL > WHATSAPP > NONE).
DO $$ BEGIN
  CREATE TYPE "CommsChannel" AS ENUM ('PUSH', 'EMAIL', 'WHATSAPP', 'NONE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "CommsDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commsType" TEXT NOT NULL,
    "channel" "CommsChannel" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommsDelivery_pkey" PRIMARY KEY ("id")
);

-- Métrica por janela (tenant) e por tipo de comms.
CREATE INDEX IF NOT EXISTS "CommsDelivery_tenantId_sentAt_idx" ON "CommsDelivery"("tenantId", "sentAt");
CREATE INDEX IF NOT EXISTS "CommsDelivery_tenantId_commsType_sentAt_idx" ON "CommsDelivery"("tenantId", "commsType", "sentAt");

DO $$ BEGIN
  ALTER TABLE "CommsDelivery" ADD CONSTRAINT "CommsDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
