-- Documento (CPF/CNPJ) do pagador: o Asaas exige documento do cliente pra emitir Pix.
-- Coletado no momento do pagamento; guardado no Contact pra reuso e snapshot no Payment.
-- Idempotente (IF NOT EXISTS) pra não travar em ambientes onde já tenha sido aplicada.
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "document" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "payerDocument" TEXT;
