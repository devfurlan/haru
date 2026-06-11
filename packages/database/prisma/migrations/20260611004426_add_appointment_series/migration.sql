-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "seriesId" TEXT;

-- CreateTable
CREATE TABLE "AppointmentSeries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentSeries_tenantId_idx" ON "AppointmentSeries"("tenantId");

-- CreateIndex
CREATE INDEX "Appointment_seriesId_idx" ON "Appointment"("seriesId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "AppointmentSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSeries" ADD CONSTRAINT "AppointmentSeries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
