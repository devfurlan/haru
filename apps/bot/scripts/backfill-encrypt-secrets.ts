/**
 * Backfill: cifra at rest os segredos que ficaram em texto puro antes da cifra
 * (Tenant.whatsappAccessToken, Contact.document, Payment.payerDocument).
 *
 * Idempotente: pula o que já está cifrado (isEncrypted). Rode UMA vez em produção,
 * depois de fazer deploy do código que cifra na escrita.
 *
 *   pnpm --filter bot backfill:encrypt-secrets           # DRY-RUN (só conta, não grava)
 *   APPLY=1 pnpm --filter bot backfill:encrypt-secrets   # aplica de fato
 *
 * Requer DATABASE_URL e PAYMENTS_ENCRYPTION_KEY no env (../../.env). A MESMA
 * PAYMENTS_ENCRYPTION_KEY do runtime - senão o app não decifra o que este script gravou.
 *
 * ponytail: loop linha-a-linha. Pra um SaaS pequeno é de sobra; se um dia forem
 * milhões de linhas, paginar/lotear os updates.
 */
import { prisma } from '@haru/database';
import { decryptSecret, encryptSecret, isEncrypted } from '@haru/payments';

const APPLY = process.env.APPLY === '1';

/** Round-trip + passthrough. Roda sempre, ANTES de tocar no banco. */
function selfCheck() {
  for (const s of ['12345678909', 'EAAGm0PX4ZCpsBO_token_da_Meta', '00000000000191']) {
    const enc = encryptSecret(s);
    if (enc === s) throw new Error('self-check: cifra igual ao texto puro');
    if (!isEncrypted(enc)) throw new Error(`self-check: isEncrypted falhou p/ cifra de "${s}"`);
    if (decryptSecret(enc) !== s) throw new Error(`self-check: round-trip falhou p/ "${s}"`);
  }
  // CPF em texto puro (só dígitos) NÃO pode ser confundido com cifra "iv:tag:ct".
  if (isEncrypted('12345678909')) throw new Error('self-check: dígitos puros parecem cifrados');
  console.log('self-check OK (encrypt/decrypt/isEncrypted/passthrough).');
}

async function encryptRows(
  label: string,
  rows: Array<{ id: string; value: string | null }>,
  save: (id: string, enc: string) => Promise<unknown>,
) {
  const pending = rows.filter((r): r is { id: string; value: string } => !!r.value && !isEncrypted(r.value));
  console.log(`${label}: ${rows.length} com valor, ${pending.length} a cifrar.`);
  if (!APPLY) return;
  for (const r of pending) await save(r.id, encryptSecret(r.value));
  console.log(`${label}: ${pending.length} cifrados.`);
}

async function main() {
  selfCheck();
  console.log(APPLY ? 'MODO APPLY: gravando no banco.' : 'DRY-RUN (defina APPLY=1 pra gravar).');

  await encryptRows(
    'Tenant.whatsappAccessToken',
    (
      await prisma.tenant.findMany({
        where: { whatsappAccessToken: { not: null } },
        select: { id: true, whatsappAccessToken: true },
      })
    ).map((t) => ({ id: t.id, value: t.whatsappAccessToken })),
    (id, enc) => prisma.tenant.update({ where: { id }, data: { whatsappAccessToken: enc } }),
  );

  await encryptRows(
    'Contact.document',
    (
      await prisma.contact.findMany({
        where: { document: { not: null } },
        select: { id: true, document: true },
      })
    ).map((c) => ({ id: c.id, value: c.document })),
    (id, enc) => prisma.contact.update({ where: { id }, data: { document: enc } }),
  );

  await encryptRows(
    'Payment.payerDocument',
    (
      await prisma.payment.findMany({
        where: { payerDocument: { not: null } },
        select: { id: true, payerDocument: true },
      })
    ).map((p) => ({ id: p.id, value: p.payerDocument })),
    (id, enc) => prisma.payment.update({ where: { id }, data: { payerDocument: enc } }),
  );

  console.log('Concluído.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
