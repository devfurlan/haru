-- Campos de NFS-e (integração fiscal Asaas) no ledger de cobranças (model Charge): id da
-- nota no Asaas p/ reconciliar o webhook INVOICE_*, link do PDF, número, erro e contador de
-- tentativas. Tudo ADITIVO e idempotente (IF NOT EXISTS) para nunca travar deploy nem
-- reaplicação.

ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "asaasInvoiceId" TEXT;
ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "nfUrl" TEXT;
ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "nfNumber" TEXT;
ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "nfError" TEXT;
ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "nfAttempts" INTEGER NOT NULL DEFAULT 0;

-- @unique em asaasInvoiceId: reconciliação 1-1 do evento INVOICE_* com a cobrança.
CREATE UNIQUE INDEX IF NOT EXISTS "Charge_asaasInvoiceId_key" ON "Charge"("asaasInvoiceId");
