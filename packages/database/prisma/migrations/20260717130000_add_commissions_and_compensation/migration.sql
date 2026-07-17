-- CreateEnum
CREATE TYPE "CompensationModel" AS ENUM ('COMMISSION_PERCENT', 'FIXED_PER_SERVICE', 'CHAIR_RENT');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "commissions" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "featCommissions" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProfessionalCompensation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "model" "CompensationModel" NOT NULL DEFAULT 'COMMISSION_PERCENT',
    "commissionPercent" INTEGER,
    "fixedPerServiceCents" INTEGER,
    "chairRentCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalCompensation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalCompensation_professionalId_key" ON "ProfessionalCompensation"("professionalId");

-- CreateIndex
CREATE INDEX "ProfessionalCompensation_tenantId_idx" ON "ProfessionalCompensation"("tenantId");

-- AddForeignKey
ALTER TABLE "ProfessionalCompensation" ADD CONSTRAINT "ProfessionalCompensation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalCompensation" ADD CONSTRAINT "ProfessionalCompensation_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

