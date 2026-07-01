-- Opt-out de lembretes por WhatsApp + monitoramento de qualidade do número.
-- Migration idempotente (IF NOT EXISTS) para não travar deploy.

-- Cliente pediu pra parar de receber lembretes por WhatsApp ("PARAR"/"SAIR").
-- Enquanto setado, o loop de lembretes pula o envio WhatsApp deste contato.
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "remindersOptOutAt" TIMESTAMP(3);

-- Última quality_rating conhecida do número na Meta (GREEN/YELLOW/RED). O loop de
-- qualidade compara contra este valor e só alerta o operador quando piora.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "whatsappQualityRating" TEXT;
