-- Fluxo de ativação do addon "Atendente IA": canal escolhido (número compartilhado do
-- Demandaê vs número próprio do estabelecimento) + identidade que o bot usa pra se
-- apresentar ao cliente final. Tudo ADITIVO e idempotente (guards / IF NOT EXISTS) para
-- nunca travar deploy nem reaplicação.

-- Canal do addon (enum novo). CREATE TYPE não tem IF NOT EXISTS -> guarda no DO block.
DO $$ BEGIN
  CREATE TYPE "AddonChannel" AS ENUM ('DEMANDAE', 'OWN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Canal escolhido na ativação do addon (null = sem addon).
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonChannel" "AddonChannel";

-- Identidade do Atendente IA (coletada na ativação; consumida pelo pipeline do bot).
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "botDisplayName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "botTone" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "botGreeting" TEXT;
