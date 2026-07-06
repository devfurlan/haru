-- Downgrade agendado (aplica na próxima renovação, nunca retroativo) + motivo de
-- cancelamento (feedback opcional). Tudo ADITIVO e idempotente (ADD COLUMN IF NOT
-- EXISTS) para nunca travar deploy nem reaplicação.
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pendingPlanTier" "PlanTier";
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pendingBillingCycle" "BillingCycle";
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "canceledReason" TEXT;
