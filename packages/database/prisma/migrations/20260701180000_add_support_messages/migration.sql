-- CreateEnum (guarded p/ idempotência - CREATE TYPE não aceita IF NOT EXISTS)
DO $$ BEGIN
  CREATE TYPE "SupportChannel" AS ENUM ('WEB', 'MOBILE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SupportRole" AS ENUM ('USER', 'ASSISTANT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SupportCategory" AS ENUM ('DUVIDA', 'CRITICA', 'SUGESTAO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportMessage" (
    "id" TEXT NOT NULL,
    "channel" "SupportChannel" NOT NULL,
    "role" "SupportRole" NOT NULL,
    "body" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT,
    "customerAccountId" TEXT,
    "feedbackCategory" "SupportCategory",
    "aboutTenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportMessage_userId_createdAt_idx" ON "SupportMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportMessage_customerAccountId_createdAt_idx" ON "SupportMessage"("customerAccountId", "createdAt");
