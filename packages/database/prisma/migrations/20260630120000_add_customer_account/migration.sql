-- Área logada do CLIENTE FINAL: identidade global com login próprio.
-- CustomerAccount é cross-tenant (enxerga agendamentos de todos os tenants onde o
-- cliente agendou), vinculada ao auth.users do Supabase pelo authId (igual User).
-- O vínculo com os Contacts (um por tenant) é por telefone - ver claimContactsByPhone.
-- Migration idempotente (IF NOT EXISTS / DO block) para não travar deploy.

-- 1) CustomerAccount -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CustomerAccount" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "termsAcceptedAt" TIMESTAMP(3),
    "termsVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerAccount_authId_key" ON "CustomerAccount"("authId");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerAccount_email_key" ON "CustomerAccount"("email");
CREATE INDEX IF NOT EXISTS "CustomerAccount_phone_idx" ON "CustomerAccount"("phone");

-- 2) Contact.customerAccountId (vínculo opcional ao login do cliente) ------------
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "customerAccountId" TEXT;

CREATE INDEX IF NOT EXISTS "Contact_customerAccountId_idx" ON "Contact"("customerAccountId");
-- Index por telefone p/ o claim cross-tenant (o unique composto começa por tenantId
-- e não serve para buscar só por phone).
CREATE INDEX IF NOT EXISTS "Contact_phone_idx" ON "Contact"("phone");

-- FK com ON DELETE SET NULL: apagar a conta do cliente não apaga o Contact (do tenant).
DO $$ BEGIN
    ALTER TABLE "Contact" ADD CONSTRAINT "Contact_customerAccountId_fkey"
        FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
