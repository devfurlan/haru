import { prisma } from '@haru/database';

/**
 * Resolve a assinatura do cliente (via contato) que cobre `serviceId` e ainda tem saldo, pra
 * descontar 1 uso no agendamento AVULSO. Retorna null quando não há cobertura (cliente
 * só-telefone sem conta, sem assinatura, serviço fora do plano, ou saldo esgotado) -> segue
 * avulso. Roda ANTES da transação do insert; o desconto real re-checa tudo atomicamente em
 * consumeCreditInTx (fonte da verdade da corrida).
 *
 * NÃO gateia pelo tier do dono: crédito já vendido é honrado mesmo se o dono caiu de plano - a
 * REGRA DURA separa "pode ofertar/cobrar" (gate no write) de "pode consumir crédito já pago".
 *
 * "Dá acesso a crédito" = ACTIVE, ou CANCELED ainda dentro do período já pago (cancelou mas os
 * créditos valem até o fim do ciclo). PAST_DUE/PENDING não descontam (créditos suspensos).
 */
export async function resolveCoveredMembership(
  tenantId: string,
  contactId: string,
  serviceId: string,
  now = new Date(),
): Promise<{ membershipId: string; creditCost: number } | null> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { customerAccountId: true },
  });
  if (!contact?.customerAccountId) return null; // só-telefone: sem conta -> sem assinatura

  const membership = await prisma.membership.findFirst({
    where: {
      tenantId,
      customerAccountId: contact.customerAccountId,
      OR: [{ status: 'ACTIVE' }, { status: 'CANCELED', currentPeriodEnd: { gt: now } }],
      // Cobertura pela composição VIVA do plano (dono pode incluir/remover serviços);
      // o PREÇO é que é congelado no snapshot da Membership, não a lista de serviços.
      plan: { services: { some: { serviceId } } },
      creditBalance: { gt: 0 },
    },
    select: {
      id: true,
      creditBalance: true,
      plan: { select: { services: { where: { serviceId }, select: { creditCost: true } } } },
    },
    // Consome primeiro a assinatura que vence antes (gasta o crédito mais "perecível").
    orderBy: { currentPeriodEnd: 'asc' },
  });
  if (!membership) return null;

  const creditCost = membership.plan.services[0]?.creditCost ?? 1;
  if (membership.creditBalance < creditCost) return null;
  return { membershipId: membership.id, creditCost };
}
