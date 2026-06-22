-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthlyCents" INTEGER NOT NULL,
    "priceAnnualCents" INTEGER NOT NULL,
    "appointmentsPerMonth" INTEGER,
    "aiMessagesPerMonth" INTEGER,
    "maxStaff" INTEGER,
    "onlinePayments" BOOLEAN NOT NULL DEFAULT false,
    "webhooks" BOOLEAN NOT NULL DEFAULT false,
    "team" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planTier" "PlanTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "guaranteeUntil" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "priceCents" INTEGER NOT NULL,
    "appointmentsLimit" INTEGER,
    "aiMessagesLimit" INTEGER,
    "maxStaff" INTEGER,
    "featOnlinePayments" BOOLEAN NOT NULL DEFAULT false,
    "featWebhooks" BOOLEAN NOT NULL DEFAULT false,
    "featTeam" BOOLEAN NOT NULL DEFAULT false,
    "asaasCustomerId" TEXT,
    "asaasSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tier_key" ON "Plan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: grandfather dos tenants existentes para PROFISSIONAL/ACTIVE com snapshot
-- dos termos vigentes. Sem isso, ligar o gating travaria clientes atuais. Idempotente:
-- só cria onde ainda não existe assinatura.
INSERT INTO "Subscription" (
    "id", "tenantId", "planTier", "status", "billingCycle",
    "currentPeriodStart", "priceCents",
    "appointmentsLimit", "aiMessagesLimit", "maxStaff",
    "featOnlinePayments", "featWebhooks", "featTeam",
    "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text, t."id", 'PROFISSIONAL', 'ACTIVE', 'MONTHLY',
    CURRENT_TIMESTAMP, 14900,
    1000, 7500, 5,
    true, true, true,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE NOT EXISTS (
    SELECT 1 FROM "Subscription" s WHERE s."tenantId" = t."id"
);
