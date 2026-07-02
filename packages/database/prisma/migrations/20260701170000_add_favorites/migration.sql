-- CreateTable
CREATE TABLE IF NOT EXISTS "Favorite" (
    "id" TEXT NOT NULL,
    "customerAccountId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_customerAccountId_tenantId_key" ON "Favorite"("customerAccountId", "tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Favorite_customerAccountId_idx" ON "Favorite"("customerAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Favorite_tenantId_idx" ON "Favorite"("tenantId");

-- AddForeignKey (guarded p/ idempotência - ADD CONSTRAINT não aceita IF NOT EXISTS)
DO $$ BEGIN
  ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_customerAccountId_fkey"
    FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
