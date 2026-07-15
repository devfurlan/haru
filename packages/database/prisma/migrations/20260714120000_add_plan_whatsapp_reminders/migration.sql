-- Cota de lembretes/WhatsApp por plano (exibida na vitrine de preços). null = ilimitado.
-- Idempotente: ADD COLUMN IF NOT EXISTS (não trava re-aplicação / deploy).
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "whatsappRemindersPerMonth" INTEGER;
