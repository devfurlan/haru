import { prisma } from '@haru/database';

import { normalizePhoneBR } from '@haru/shared';

// SEGURANÇA (LGPD): este claim expõe dados de terceiros (nome/CPF/histórico) ligados
// a um telefone. Por isso SÓ pode ser chamado APÓS provar a posse do número. Hoje a
// única porta é o customerSignUp, que valida um OTP por SMS (Twilio Verify) antes de
// chamar esta função - ver checkPhoneOtp em apps/web/src/lib/twilio-verify.ts.
// NÃO chame este claim em nenhum fluxo sem essa verificação de posse.

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
