-- Telefone informado no cadastro mas ainda NÃO verificado. Mantido separado de
-- "phone" (que só recebe número confirmado por OTP) pra nunca disparar o claim de
-- contatos sem prova de posse. Idempotente: seguro reaplicar.
ALTER TABLE "CustomerAccount" ADD COLUMN IF NOT EXISTS "pendingPhone" TEXT;
