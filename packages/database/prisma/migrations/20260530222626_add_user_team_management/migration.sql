-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "inviteTemplateLanguage" TEXT DEFAULT 'pt_BR',
ADD COLUMN     "inviteTemplateName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "invitedAt" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
