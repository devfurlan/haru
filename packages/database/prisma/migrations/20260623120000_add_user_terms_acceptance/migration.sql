-- Prova de consentimento: aceite obrigatório dos Termos/Privacidade no cadastro.
-- Idempotente (IF NOT EXISTS) para não travar em bases já parcialmente migradas.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;
