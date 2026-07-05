-- CPF/CNPJ (criptografado) e data de nascimento no nível da CONTA do cliente.
-- Antes viviam só nos Contacts (por-tenant); um cliente sem nenhum agendamento não
-- tinha onde guardar, e o cadastro em "Meus dados" era descartado silenciosamente.
ALTER TABLE "CustomerAccount" ADD COLUMN IF NOT EXISTS "document" TEXT;
ALTER TABLE "CustomerAccount" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
