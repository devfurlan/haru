import { prisma } from '@haru/database';

import { normalizePhoneBR } from '@/lib/format';

// DÍVIDA TÉCNICA / LGPD (BLOQUEANTE PARA PRODUÇÃO):
// Hoje o vínculo conta<->Contacts é feito pelo telefone informado no cadastro, SEM
// verificar posse do número. Em produção isso permitiria alguém digitar o telefone
// de outra pessoa e ver nome/CPF/histórico dela. ANTES DO GO-LIVE, exigir verificação
// de posse do telefone (OTP por WhatsApp/SMS) antes de efetivar este claim.
// Aceitável agora só porque o produto não está em produção e os dados são de teste.

/**
 * Vincula à conta (claim) TODOS os Contacts de um mesmo telefone, em qualquer tenant.
 * É o elo que torna a conta cross-tenant: o cliente passa a enxergar o histórico de
 * todos os estabelecimentos onde aquele número agendou.
 *
 * Idempotente. Só reivindica Contacts ainda livres (`customerAccountId: null`), pra
 * não "roubar" um número já vinculado a outra conta. Retorna quantos foram vinculados.
 */
export async function claimContactsByPhone(
  customerAccountId: string,
  phone: string,
): Promise<{ claimed: number }> {
  const e164 = normalizePhoneBR(phone);
  if (!/^55\d{10,11}$/.test(e164)) return { claimed: 0 };

  const { count } = await prisma.contact.updateMany({
    where: { phone: e164, customerAccountId: null },
    data: { customerAccountId },
  });
  return { claimed: count };
}
