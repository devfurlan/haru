-- Dedup de webhook de billing: id da última cobrança do Asaas já contabilizada
-- (evita e-mail/recibo duplicado entre PAYMENT_CONFIRMED e PAYMENT_RECEIVED).
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "lastBilledPaymentId" TEXT;
