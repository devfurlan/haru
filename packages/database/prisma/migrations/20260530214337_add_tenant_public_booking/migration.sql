-- CreateEnum
CREATE TYPE "PublicBookingConfirmation" AS ENUM ('PENDING', 'CONFIRMED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "publicBookingConfirmation" "PublicBookingConfirmation" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "publicBookingEnabled" BOOLEAN NOT NULL DEFAULT true;
