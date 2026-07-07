-- Lembrete do cliente agora em MINUTOS (antes: horas). Converte os valores
-- existentes (horas -> minutos, x60) e muda o default de 24h para 30 min.
-- Guardado por IF EXISTS pra ser idempotente (não aplica x60 duas vezes).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Tenant' AND column_name = 'reminderHoursBefore'
  ) THEN
    ALTER TABLE "Tenant" RENAME COLUMN "reminderHoursBefore" TO "reminderMinutesBefore";
    UPDATE "Tenant" SET "reminderMinutesBefore" = "reminderMinutesBefore" * 60;
  END IF;
END $$;

ALTER TABLE "Tenant" ALTER COLUMN "reminderMinutesBefore" SET DEFAULT 30;
