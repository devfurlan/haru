-- Modelo comercial consolidado (jul/2026): addon "Atendente IA no WhatsApp" com
-- tetos de conversa próprios + ciclo anual parcelado 12x. Tudo ADITIVO e idempotente
-- (IF NOT EXISTS / guards) para nunca travar deploy nem reaplicação.

-- Novo ciclo de cobrança: anual parcelado em 12x (taxas repassadas ao cliente).
-- ADD VALUE não é usado nesta mesma migração (só declarado), então roda sem problema.
ALTER TYPE "BillingCycle" ADD VALUE IF NOT EXISTS 'ANNUAL_INSTALLMENTS';

-- Tiers do addon (enum novo). CREATE TYPE não tem IF NOT EXISTS -> guarda no DO block.
DO $$ BEGIN
  CREATE TYPE "AddonTier" AS ENUM ('BOT_SOLO', 'BOT_TIME', 'BOT_MULTI');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Valor de cada parcela no anual 12x do plano base.
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "priceAnnualInstallmentCents" INTEGER NOT NULL DEFAULT 0;

-- Catálogo do addon (mesma lógica de grandfather do Plan).
CREATE TABLE IF NOT EXISTS "AddonPlan" (
    "id" TEXT NOT NULL,
    "tier" "AddonTier" NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthlyCents" INTEGER NOT NULL,
    "priceAnnualCents" INTEGER NOT NULL DEFAULT 0,
    "priceAnnualInstallmentCents" INTEGER NOT NULL DEFAULT 0,
    "setupFeeCents" INTEGER NOT NULL,
    "conversationsPerMonth" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddonPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AddonPlan_tier_key" ON "AddonPlan"("tier");

-- Snapshot do addon na Subscription (grandfather; independente do plano base).
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonTier" "AddonTier";
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonBillingCycle" "BillingCycle";
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonPriceCents" INTEGER;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonSetupFeeCents" INTEGER;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonConversationsLimit" INTEGER;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonSetupChargedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonActivatedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonCanceledAt" TIMESTAMP(3);
