-- Assinatura de serviços do cliente final ("Clube"): o DONO cria planos (MembershipPlan
-- + MembershipPlanService), o CLIENTE assina (Membership) pagando mensal pelo gateway do
-- próprio tenant, cada cobrança vira MembershipCharge e os créditos entram/saem via
-- MembershipCreditLedger (fonte da verdade; Membership.creditBalance é o cache-guarda).
-- NÃO confundir com Subscription (assinatura do DONO ao Demandaê).
-- Idempotente (IF NOT EXISTS / DO-block) para nunca travar em re-aplicação.

-- Enums.
DO $$ BEGIN
  CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "MembershipInterval" AS ENUM ('MONTHLY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "MembershipLedgerReason" AS ENUM ('CYCLE_GRANT', 'REDEEM', 'REVERSAL', 'EXPIRE', 'ADJUST');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Link do crédito consumido no agendamento (null = avulso).
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "membershipId" TEXT;

-- Plano de assinatura ofertado pelo dono.
CREATE TABLE IF NOT EXISTS "MembershipPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "interval" "MembershipInterval" NOT NULL DEFAULT 'MONTHLY',
    "creditsPerCycle" INTEGER NOT NULL,
    "creditRollover" BOOLEAN NOT NULL DEFAULT false,
    "rolloverCap" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MembershipPlan_tenantId_active_idx" ON "MembershipPlan"("tenantId", "active");

-- Serviços cobertos por um plano (N:N) + custo em créditos.
CREATE TABLE IF NOT EXISTS "MembershipPlanService" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "creditCost" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "MembershipPlanService_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MembershipPlanService_serviceId_idx" ON "MembershipPlanService"("serviceId");
CREATE UNIQUE INDEX IF NOT EXISTS "MembershipPlanService_planId_serviceId_key" ON "MembershipPlanService"("planId", "serviceId");

-- Assinatura de um cliente ao plano do tenant.
CREATE TABLE IF NOT EXISTS "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "customerAccountId" TEXT NOT NULL,
    "contactId" TEXT,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "planName" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "creditsPerCycle" INTEGER NOT NULL,
    "creditRollover" BOOLEAN NOT NULL DEFAULT false,
    "rolloverCap" INTEGER,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "creditsExpireAt" TIMESTAMP(3),
    "lowCreditsNotifiedAt" TIMESTAMP(3),
    "provider" "PaymentProvider" NOT NULL,
    "gatewayCustomerId" TEXT,
    "gatewaySubscriptionId" TEXT,
    "cardLast4" TEXT,
    "cardBrand" TEXT,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_gatewaySubscriptionId_key" ON "Membership"("gatewaySubscriptionId");
CREATE INDEX IF NOT EXISTS "Membership_tenantId_status_idx" ON "Membership"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Membership_customerAccountId_status_idx" ON "Membership"("customerAccountId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_planId_customerAccountId_key" ON "Membership"("planId", "customerAccountId");

-- Recibo de cada cobrança mensal recorrente.
CREATE TABLE IF NOT EXISTS "MembershipCharge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CREDIT_CARD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "externalId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MembershipCharge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MembershipCharge_membershipId_idx" ON "MembershipCharge"("membershipId");
CREATE INDEX IF NOT EXISTS "MembershipCharge_tenantId_status_idx" ON "MembershipCharge"("tenantId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "MembershipCharge_provider_externalId_key" ON "MembershipCharge"("provider", "externalId");

-- Ledger de créditos (fonte da verdade do saldo).
CREATE TABLE IF NOT EXISTS "MembershipCreditLedger" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "MembershipLedgerReason" NOT NULL,
    "chargeId" TEXT,
    "appointmentId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembershipCreditLedger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MembershipCreditLedger_membershipId_createdAt_idx" ON "MembershipCreditLedger"("membershipId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "MembershipCreditLedger_appointmentId_reason_key" ON "MembershipCreditLedger"("appointmentId", "reason");

CREATE INDEX IF NOT EXISTS "Appointment_membershipId_idx" ON "Appointment"("membershipId");

-- FKs.
DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_membershipId_fkey"
    FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "MembershipPlanService" ADD CONSTRAINT "MembershipPlanService_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "MembershipPlanService" ADD CONSTRAINT "MembershipPlanService_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Membership" ADD CONSTRAINT "Membership_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customerAccountId_fkey"
    FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Membership" ADD CONSTRAINT "Membership_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "MembershipCharge" ADD CONSTRAINT "MembershipCharge_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "MembershipCharge" ADD CONSTRAINT "MembershipCharge_membershipId_fkey"
    FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "MembershipCreditLedger" ADD CONSTRAINT "MembershipCreditLedger_membershipId_fkey"
    FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "MembershipCreditLedger" ADD CONSTRAINT "MembershipCreditLedger_chargeId_fkey"
    FOREIGN KEY ("chargeId") REFERENCES "MembershipCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "MembershipCreditLedger" ADD CONSTRAINT "MembershipCreditLedger_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
