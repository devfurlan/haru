-- Campos do perfil comercial sincronizados com o WhatsApp Business (push a
-- partir de /business): descrição do negócio, status/recado curto (`about`) e
-- e-mail de contato. Todos opcionais. Idempotente (ADD COLUMN IF NOT EXISTS)
-- para não travar deploy caso a coluna já exista.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "whatsappAbout" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "email" TEXT;
