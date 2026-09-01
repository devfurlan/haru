-- Marcos do lembrete por push já enviados (minutos antes do atendimento: 1440, 60, 30).
-- Idempotente: IF NOT EXISTS pra a migration poder ser reaplicada sem travar o deploy.
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "reminderPushMarks" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
