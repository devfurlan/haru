-- Lembrete de retorno inteligente: cutuca o cliente pra reagendar quando chega a hora do
-- próximo atendimento (preventivo). Config por tenant (dono) + opt-out do cliente + ciclo
-- padrão por serviço + tabela ReturnReminder (dedup por ciclo + log de conversão por canal).
-- Idempotente (IF NOT EXISTS / DO-block) para nunca travar em re-aplicação.

-- Canal primário de um lembrete de retorno (hierarquia own-channels-first: PUSH > EMAIL > WHATSAPP).
DO $$ BEGIN
  CREATE TYPE "ReturnReminderChannel" AS ENUM ('PUSH', 'EMAIL', 'WHATSAPP', 'NONE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Liga/desliga por tenant (dono, default ON) + opt-out por-tipo do cliente + ciclo padrão do serviço.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "returnRemindersEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CustomerAccount" ADD COLUMN IF NOT EXISTS "returnRemindersEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "returnCycleDays" INTEGER;

-- Lembrete enviado: dedup por ciclo (unique contactId+serviceId+cycleAnchor, carimbado ANTES do
-- envio) + log de métrica (canal primário + conversão por janela sobre createdAt).
CREATE TABLE IF NOT EXISTS "ReturnReminder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "professionalId" TEXT,
    "channel" "ReturnReminderChannel" NOT NULL,
    "cycleAnchor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnReminder_pkey" PRIMARY KEY ("id")
);

-- Anti-spam por contato (min-gap) + métrica por janela (tenant) + dedup por ciclo (unique).
CREATE INDEX IF NOT EXISTS "ReturnReminder_contactId_sentAt_idx" ON "ReturnReminder"("contactId", "sentAt");
CREATE INDEX IF NOT EXISTS "ReturnReminder_tenantId_sentAt_idx" ON "ReturnReminder"("tenantId", "sentAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ReturnReminder_contactId_serviceId_cycleAnchor_key" ON "ReturnReminder"("contactId", "serviceId", "cycleAnchor");

DO $$ BEGIN
  ALTER TABLE "ReturnReminder" ADD CONSTRAINT "ReturnReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ReturnReminder" ADD CONSTRAINT "ReturnReminder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ReturnReminder" ADD CONSTRAINT "ReturnReminder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
