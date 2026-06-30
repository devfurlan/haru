-- Notificações/lembretes de agendamento por E-MAIL (cliente + dono).
-- Preferências de opt-out por parte + dedup do lembrete por e-mail.
-- Migration idempotente (IF NOT EXISTS) para não travar deploy.

-- Dono: receber e-mail dos eventos de agendamento (novo / cancel / remarcação).
ALTER TABLE "Tenant"
    ADD COLUMN IF NOT EXISTS "ownerAppointmentEmailsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Cliente: receber e-mails dos próprios agendamentos.
ALTER TABLE "CustomerAccount"
    ADD COLUMN IF NOT EXISTS "appointmentEmailsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Dedup do lembrete por e-mail ao cliente (separado de reminderSentAt = WhatsApp).
ALTER TABLE "Appointment"
    ADD COLUMN IF NOT EXISTS "reminderEmailSentAt" TIMESTAMP(3);
