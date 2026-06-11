-- Handoff humano: o dono assume a conversa e o bot fica em silêncio.
-- handoffExpiresAt no futuro = modo humano; null = bot ativo.
-- Idempotente (ADD COLUMN IF NOT EXISTS / constraint guard) — segura re-aplicação.

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "handoffExpiresAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "handoffById" TEXT;

DO $$ BEGIN
  ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_handoffById_fkey"
    FOREIGN KEY ("handoffById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
