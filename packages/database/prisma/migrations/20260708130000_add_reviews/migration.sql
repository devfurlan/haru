-- Avaliações (Review) + campos denormalizados de rating no Tenant.
-- Idempotente (IF NOT EXISTS / DO-block nas FKs) para nunca travar em re-aplicação.

-- Tenant: média e contagem de avaliações (denormalizados de Review).
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ratingAvg" DOUBLE PRECISION;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- Tabela de avaliações.
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "customerAccountId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_customerAccountId_tenantId_key" ON "Review"("customerAccountId", "tenantId");
CREATE INDEX IF NOT EXISTS "Review_tenantId_idx" ON "Review"("tenantId");

DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_customerAccountId_fkey"
    FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
