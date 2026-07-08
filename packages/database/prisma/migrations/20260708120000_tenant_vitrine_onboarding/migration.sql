-- Vitrine da página pública + flag de onboarding do dono (redesign "Painel do Dono").
-- Aditivo e idempotente (ADD COLUMN IF NOT EXISTS). Não altera dados existentes exceto
-- o backfill de onboarding abaixo.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "segment" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "about" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "coverImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

-- Backfill: tenants JÁ existentes recebem now() para NÃO caírem no wizard de onboarding.
-- Só tenants criados depois desta migration (coluna NULL) veem o /onboarding.
UPDATE "Tenant" SET "onboardingCompletedAt" = now() WHERE "onboardingCompletedAt" IS NULL;
