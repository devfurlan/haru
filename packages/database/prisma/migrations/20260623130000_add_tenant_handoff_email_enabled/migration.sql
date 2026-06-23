-- Opt-out por tenant do e-mail de aviso quando um cliente pede atendimento humano.
-- O aviso no painel/realtime é sempre enviado; só o e-mail é opcional.
-- Idempotente (ADD COLUMN IF NOT EXISTS) - segura re-aplicação.

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "handoffEmailEnabled" BOOLEAN NOT NULL DEFAULT true;
