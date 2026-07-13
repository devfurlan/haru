-- Fila de espera (waitlist): WaitlistEntry (a fila por tenant+profissional+dia) e
-- WaitlistOffer (o episódio de match + estado das ondas + reserva temporária derivada).
-- Marca de origem no Appointment (receita recuperada) e config por tenant.
-- Idempotente (IF NOT EXISTS / DO-block) para nunca travar em re-aplicação.

-- Enums.
DO $$ BEGIN
  CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'FULFILLED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "WaitlistOfferStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'EXHAUSTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Config por tenant.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "waitlistWindowMinutes" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "waitlistNotifyAllAtOnce" BOOLEAN NOT NULL DEFAULT false;

-- Marca de origem no agendamento (métrica de receita recuperada, derivada on-read).
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "fromWaitlist" BOOLEAN NOT NULL DEFAULT false;

-- A fila (o desejo em espera).
CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WaitlistEntry_tenantId_professionalId_date_contactId_key" ON "WaitlistEntry"("tenantId", "professionalId", "date", "contactId");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_tenantId_professionalId_date_status_idx" ON "WaitlistEntry"("tenantId", "professionalId", "date", "status");

-- O episódio de match (ondas + reserva temporária).
CREATE TABLE IF NOT EXISTS "WaitlistOffer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "wave" INTEGER NOT NULL DEFAULT 1,
    "nextWaveAt" TIMESTAMP(3) NOT NULL,
    "holdExpiresAt" TIMESTAMP(3) NOT NULL,
    "notifiedEntryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "WaitlistOfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitlistOffer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WaitlistOffer_status_nextWaveAt_idx" ON "WaitlistOffer"("status", "nextWaveAt");
CREATE INDEX IF NOT EXISTS "WaitlistOffer_tenantId_professionalId_date_idx" ON "WaitlistOffer"("tenantId", "professionalId", "date");

-- FKs.
DO $$ BEGIN
  ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "WaitlistOffer" ADD CONSTRAINT "WaitlistOffer_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "WaitlistOffer" ADD CONSTRAINT "WaitlistOffer_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
