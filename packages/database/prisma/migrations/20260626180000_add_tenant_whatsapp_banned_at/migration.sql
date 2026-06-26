-- Marca quando o número de WhatsApp do tenant foi detectado como BANIDO pela Meta
-- (status do phone number = BANNED). O loop de lembretes passa a pular tenants
-- com este campo setado (não adianta re-tentar: a Meta recusa tudo com #135000),
-- e o alerta por e-mail é disparado uma vez na transição para banido.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "whatsappBannedAt" TIMESTAMP(3);
