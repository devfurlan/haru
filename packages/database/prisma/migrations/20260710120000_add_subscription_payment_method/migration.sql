-- Forma de pagamento da recorrência da assinatura (fluxo "Trocar forma de pagamento").
-- Colunas aditivas e nullable - reusa o enum PaymentMethod já existente (PIX/CREDIT_CARD).
-- Idempotente (IF NOT EXISTS) para nunca travar em re-aplicação.

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cardLast4" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cardBrand" TEXT;
-- Token do cartão devolvido pelo Asaas (NÃO é dado de cartão). PAN/CVV nunca são persistidos.
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "asaasCardToken" TEXT;
-- id da autorização de Pix Automático (autoriza-uma-vez). null = Pix por ciclo.
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pixRecurringId" TEXT;
