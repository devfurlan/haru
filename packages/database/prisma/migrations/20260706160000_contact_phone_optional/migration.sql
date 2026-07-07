-- WhatsApp é acessório: cliente logado pode agendar sem número (identidade vem da
-- CustomerAccount). Torna Contact.phone opcional. O @@unique([tenantId, phone]) sobrevive
-- (no Postgres múltiplos NULL são distintos), então quem TEM telefone continua deduplicado.
-- Não-destrutivo e idempotente (DROP NOT NULL numa coluna já nullable é no-op).

-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "phone" DROP NOT NULL;
