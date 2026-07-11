-- Programa de fidelidade (cartão de carimbos) por tenant. Os carimbos derivam do
-- histórico de agendamentos (ver apps/web/src/lib/loyalty.ts); só o resgate é gravado.
-- Idempotente (IF NOT EXISTS / DO-block) para nunca travar em re-aplicação.

-- Enums.
DO $$ BEGIN
  CREATE TYPE "LoyaltyPrizeKind" AS ENUM ('FREE_SERVICE', 'DISCOUNT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "LoyaltyCountMode" AS ENUM ('ALL_SERVICES', 'SPECIFIC');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Programa (um por tenant).
CREATE TABLE IF NOT EXISTS "LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stampsRequired" INTEGER NOT NULL DEFAULT 10,
    "prizeKind" "LoyaltyPrizeKind" NOT NULL DEFAULT 'FREE_SERVICE',
    "prizeServiceId" TEXT,
    "discountPercent" INTEGER,
    "countMode" "LoyaltyCountMode" NOT NULL DEFAULT 'ALL_SERVICES',
    "stampTtlDays" INTEGER,
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyProgram_tenantId_key" ON "LoyaltyProgram"("tenantId");

-- Serviços que contam carimbo quando countMode = SPECIFIC (N:N).
CREATE TABLE IF NOT EXISTS "LoyaltyProgramService" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    CONSTRAINT "LoyaltyProgramService_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyProgramService_programId_serviceId_key" ON "LoyaltyProgramService"("programId", "serviceId");
CREATE INDEX IF NOT EXISTS "LoyaltyProgramService_serviceId_idx" ON "LoyaltyProgramService"("serviceId");

-- Resgates (zera o cartão a partir de redeemedAt).
CREATE TABLE IF NOT EXISTS "LoyaltyRedemption" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "stampsUsed" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyRedemption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LoyaltyRedemption_programId_contactId_redeemedAt_idx" ON "LoyaltyRedemption"("programId", "contactId", "redeemedAt");
CREATE INDEX IF NOT EXISTS "LoyaltyRedemption_contactId_idx" ON "LoyaltyRedemption"("contactId");

-- FKs.
DO $$ BEGIN
  ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_prizeServiceId_fkey"
    FOREIGN KEY ("prizeServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyProgramService" ADD CONSTRAINT "LoyaltyProgramService_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyProgramService" ADD CONSTRAINT "LoyaltyProgramService_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
