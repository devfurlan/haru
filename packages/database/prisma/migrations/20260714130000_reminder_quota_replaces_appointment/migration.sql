-- Realinhamento comercial: a quota do plano base deixa de ser AGENDAMENTOS (agora
-- ilimitados em todos os planos) e passa a ser LEMBRETES POR WHATSAPP. Idempotente
-- (ADD/DROP COLUMN IF EXISTS, CREATE INDEX IF NOT EXISTS) para rodar em qualquer estado.

-- Novo campo de snapshot: cota mensal de lembretes por WhatsApp (congela Plan.whatsappRemindersPerMonth).
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "whatsappRemindersLimit" INTEGER;

-- Backfill das assinaturas existentes: cota vem do Plan pelo tier vigente. Só preenche
-- quem ainda está nulo (idempotente em re-run).
UPDATE "Subscription" s
SET "whatsappRemindersLimit" = p."whatsappRemindersPerMonth"
FROM "Plan" p
WHERE p."tier" = s."planTier" AND s."whatsappRemindersLimit" IS NULL;

-- Eixo antigo morto: quota de agendamento (ilimitado agora) e IA no plano base (virou addon).
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "appointmentsLimit";
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "aiMessagesLimit";
ALTER TABLE "Plan" DROP COLUMN IF EXISTS "appointmentsPerMonth";
ALTER TABLE "Plan" DROP COLUMN IF EXISTS "aiMessagesPerMonth";

-- Índice para a contagem de lembretes WhatsApp enviados no ciclo (getMonthlyWhatsappReminderUsage).
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_reminderSentAt_idx" ON "Appointment"("tenantId", "reminderSentAt");
