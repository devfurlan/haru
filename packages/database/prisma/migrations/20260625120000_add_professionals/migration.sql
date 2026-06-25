-- Múltiplos profissionais por tenant.
-- Profissional = User com isProfessional=true (agenda própria); recepcionista =
-- User com isProfessional=false (apoio, sem agenda). ScheduleBlock, Appointment e
-- ScheduleException passam a ser por profissional; serviços viram N:N com
-- profissionais. Limite por plano deixa de ser maxStaff e vira dois tetos
-- independentes: maxProfessionals + maxReceptionists.
--
-- Backfill na própria migration (mesmo padrão da migration de billing): o OWNER de
-- cada tenant vira o profissional dono de toda a agenda/serviços existentes,
-- preservando o caso solo atual. Idempotente onde possível.

-- 1) User.isProfessional ---------------------------------------------------------
ALTER TABLE "User" ADD COLUMN "isProfessional" BOOLEAN NOT NULL DEFAULT false;

-- OWNER de cada tenant nasce profissional (preserva a agenda solo atual).
UPDATE "User" SET "isProfessional" = true WHERE "role" = 'OWNER';

-- 2) ScheduleBlock.professionalId ------------------------------------------------
ALTER TABLE "ScheduleBlock" ADD COLUMN "professionalId" TEXT;

-- Aponta cada bloco para o OWNER mais antigo do tenant.
UPDATE "ScheduleBlock" sb SET "professionalId" = (
    SELECT u."id" FROM "User" u
    WHERE u."tenantId" = sb."tenantId" AND u."role" = 'OWNER'
    ORDER BY u."createdAt" ASC LIMIT 1
) WHERE sb."professionalId" IS NULL;

-- Fallback: tenant sem OWNER (não deve ocorrer) -> usuário mais antigo qualquer.
UPDATE "ScheduleBlock" sb SET "professionalId" = (
    SELECT u."id" FROM "User" u
    WHERE u."tenantId" = sb."tenantId"
    ORDER BY u."createdAt" ASC LIMIT 1
) WHERE sb."professionalId" IS NULL;

-- Tenant sem nenhum usuário (impossível pelo signup): descarta blocos órfãos.
DELETE FROM "ScheduleBlock" WHERE "professionalId" IS NULL;

ALTER TABLE "ScheduleBlock" ALTER COLUMN "professionalId" SET NOT NULL;

DROP INDEX IF EXISTS "ScheduleBlock_tenantId_weekday_idx";
CREATE INDEX "ScheduleBlock_tenantId_professionalId_weekday_idx" ON "ScheduleBlock"("tenantId", "professionalId", "weekday");
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Appointment.professionalId --------------------------------------------------
ALTER TABLE "Appointment" ADD COLUMN "professionalId" TEXT;

UPDATE "Appointment" a SET "professionalId" = (
    SELECT u."id" FROM "User" u
    WHERE u."tenantId" = a."tenantId" AND u."role" = 'OWNER'
    ORDER BY u."createdAt" ASC LIMIT 1
) WHERE a."professionalId" IS NULL;

UPDATE "Appointment" a SET "professionalId" = (
    SELECT u."id" FROM "User" u
    WHERE u."tenantId" = a."tenantId"
    ORDER BY u."createdAt" ASC LIMIT 1
) WHERE a."professionalId" IS NULL;

ALTER TABLE "Appointment" ALTER COLUMN "professionalId" SET NOT NULL;

CREATE INDEX "Appointment_professionalId_startsAt_idx" ON "Appointment"("professionalId", "startsAt");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4) ScheduleException.professionalId (opcional; null = folga do tenant inteiro) --
ALTER TABLE "ScheduleException" ADD COLUMN "professionalId" TEXT;
ALTER TABLE "ScheduleException" ADD CONSTRAINT "ScheduleException_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) ProfessionalService (N:N profissional <-> serviço) --------------------------
CREATE TABLE "ProfessionalService" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalService_professionalId_serviceId_key" ON "ProfessionalService"("professionalId", "serviceId");
CREATE INDEX "ProfessionalService_serviceId_idx" ON "ProfessionalService"("serviceId");
ALTER TABLE "ProfessionalService" ADD CONSTRAINT "ProfessionalService_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalService" ADD CONSTRAINT "ProfessionalService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada serviço existente passa a ser atendido pelo OWNER (profissional
-- migrado). Idempotente: só insere onde ainda não existe o par.
INSERT INTO "ProfessionalService" ("id", "professionalId", "serviceId", "createdAt")
SELECT gen_random_uuid()::text, owner."id", s."id", CURRENT_TIMESTAMP
FROM "Service" s
JOIN LATERAL (
    SELECT u."id" FROM "User" u
    WHERE u."tenantId" = s."tenantId" AND u."role" = 'OWNER'
    ORDER BY u."createdAt" ASC LIMIT 1
) owner ON true
WHERE NOT EXISTS (
    SELECT 1 FROM "ProfessionalService" ps
    WHERE ps."serviceId" = s."id" AND ps."professionalId" = owner."id"
);

-- 6) Plan: maxStaff -> maxProfessionals + maxReceptionists -----------------------
ALTER TABLE "Plan" ADD COLUMN "maxProfessionals" INTEGER;
ALTER TABLE "Plan" ADD COLUMN "maxReceptionists" INTEGER;
UPDATE "Plan" SET "maxProfessionals" = "maxStaff", "maxReceptionists" = 0;
ALTER TABLE "Plan" DROP COLUMN "maxStaff";

-- 7) Subscription: maxStaff -> maxProfessionals + maxReceptionists ---------------
-- Snapshot dos clientes existentes: preserva a capacidade contratada como
-- profissionais; recepcionistas começam em 0 (admin ajusta por tenant depois).
ALTER TABLE "Subscription" ADD COLUMN "maxProfessionals" INTEGER;
ALTER TABLE "Subscription" ADD COLUMN "maxReceptionists" INTEGER;
UPDATE "Subscription" SET "maxProfessionals" = "maxStaff", "maxReceptionists" = 0;
ALTER TABLE "Subscription" DROP COLUMN "maxStaff";
