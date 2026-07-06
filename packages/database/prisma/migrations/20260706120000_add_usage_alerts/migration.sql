-- Dedup dos alertas de uso PUSH (email/WhatsApp): uma linha por (tenant, métrica,
-- janela de cota); `level` = maior nível já alertado no ciclo. Tudo aditivo e
-- idempotente (IF NOT EXISTS / guards) para nunca travar deploy nem reaplicação.

CREATE TABLE IF NOT EXISTS "UsageAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UsageAlert_tenantId_metric_windowStart_key" ON "UsageAlert"("tenantId", "metric", "windowStart");
CREATE INDEX IF NOT EXISTS "UsageAlert_tenantId_idx" ON "UsageAlert"("tenantId");

DO $$ BEGIN
  ALTER TABLE "UsageAlert" ADD CONSTRAINT "UsageAlert_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
