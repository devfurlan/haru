-- Ledger local de cobranças da assinatura do SaaS (rastreabilidade: cada cobrança
-- carrega plano/ciclo/valor vigentes + estado de pagamento e NF). Tudo ADITIVO e
-- idempotente (IF NOT EXISTS / guards) para nunca travar deploy nem reaplicação.

-- Enums do ledger. CREATE TYPE não tem IF NOT EXISTS -> guarda em DO block.
DO $$ BEGIN
  CREATE TYPE "ChargeKind" AS ENUM ('PLAN', 'ADDON', 'PLAN_ADDON', 'SETUP');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NfStatus" AS ENUM ('NONE', 'PENDING', 'ISSUED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Charge" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "asaasPaymentId" TEXT NOT NULL,
    "asaasSubscriptionId" TEXT,
    "kind" "ChargeKind" NOT NULL,
    "planTier" "PlanTier" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "nfStatus" "NfStatus" NOT NULL DEFAULT 'NONE',
    "nfCostCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Charge_asaasPaymentId_key" ON "Charge"("asaasPaymentId");
CREATE INDEX IF NOT EXISTS "Charge_subscriptionId_idx" ON "Charge"("subscriptionId");
CREATE INDEX IF NOT EXISTS "Charge_status_idx" ON "Charge"("status");

DO $$ BEGIN
  ALTER TABLE "Charge" ADD CONSTRAINT "Charge_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
