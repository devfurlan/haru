-- Catálogo multi-plano: o admin passa a criar N planos por tier (os personalizados são
-- active=false, fora da vitrine) e atribuir um plano ESPECÍFICO a um estabelecimento.
-- Gating de fila/clube sai do tier ao vivo e vira flag fotografada na Subscription.
-- Idempotente (IF EXISTS / IF NOT EXISTS) para rodar em qualquer estado.

-- 1) tier deixa de ser único (o unique vem do @unique antigo: constraint OU índice).
ALTER TABLE "Plan" DROP CONSTRAINT IF EXISTS "Plan_tier_key";
DROP INDEX IF EXISTS "Plan_tier_key";
CREATE INDEX IF NOT EXISTS "Plan_tier_idx" ON "Plan"("tier");

-- 2) ...mas só pode existir UM plano PÚBLICO por tier. Índice parcial (não é expressável no
--    schema.prisma; é a garantia real de que getPublicPlan(tier) resolve um único plano).
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_tier_active_key" ON "Plan"("tier") WHERE "active";

-- 3) Flags de feature por plano + snapshot correspondente na assinatura.
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "waitlist" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "serviceSubscriptions" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "featWaitlist" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "featServiceSubscriptions" BOOLEAN NOT NULL DEFAULT false;

-- 4) Rastreabilidade: qual plano gerou o snapshot. SetNull preserva os termos contratados.
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "planId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_planId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Subscription_planId_idx" ON "Subscription"("planId");

-- 5) Backfill preservando EXATAMENTE a regra vigente (Time+ tem fila/clube; Solo não),
--    para que ninguém ganhe nem perca feature na migração (grandfather).
UPDATE "Plan"
   SET "waitlist" = ("tier" <> 'ESSENCIAL'),
       "serviceSubscriptions" = ("tier" <> 'ESSENCIAL')
 WHERE "waitlist" = false AND "serviceSubscriptions" = false;

UPDATE "Subscription"
   SET "featWaitlist" = ("planTier" <> 'ESSENCIAL'),
       "featServiceSubscriptions" = ("planTier" <> 'ESSENCIAL')
 WHERE "featWaitlist" = false AND "featServiceSubscriptions" = false;

-- Assinantes atuais apontam para o plano público do tier vigente (best-effort).
UPDATE "Subscription" s
   SET "planId" = p."id"
  FROM "Plan" p
 WHERE p."tier" = s."planTier" AND p."active" AND s."planId" IS NULL;
