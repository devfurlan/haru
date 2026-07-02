-- Setup (configuração assistida do WhatsApp): marca quando foi contratado - no checkout
-- (opt-in mensal), na ativação do WhatsApp, ou coberto pelo anual. Evita cobrar 2x.
-- Idempotente (IF NOT EXISTS) para nunca travar deploy/reaplicação.
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "setupChargedAt" TIMESTAMP(3);
