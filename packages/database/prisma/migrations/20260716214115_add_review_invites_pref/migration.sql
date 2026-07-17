-- Preferência do cliente de receber o convite pós-atendimento pra avaliar (e-mail + push +
-- WhatsApp). Toggle no perfil (web e app), igual ao appointmentEmailsEnabled. Idempotente.
ALTER TABLE "CustomerAccount" ADD COLUMN IF NOT EXISTS "reviewInvitesEnabled" BOOLEAN NOT NULL DEFAULT true;
