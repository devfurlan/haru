-- Controle de presença: marca se o DONO confirmou a presença (COMPLETED/NO_SHOW pelo
-- painel) ou se o agendamento foi fechado automaticamente pelo cron de fim de dia.
-- Idempotente (IF NOT EXISTS) pra nunca travar em re-aplicação.
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "attendanceConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: fecha retroativamente o que já terminou e ficou parado em PENDING/CONFIRMED.
-- Só marca COMPLETED (NUNCA NO_SHOW - não dá pra inferir falta). attendanceConfirmed fica
-- false: foi fechamento automático, não confirmação do dono. Idempotente (a 2ª rodada não
-- reencontra PENDING/CONFIRMED no passado).
UPDATE "Appointment"
SET "status" = 'COMPLETED'
WHERE "endsAt" < now()
  AND "status" IN ('PENDING', 'CONFIRMED');
