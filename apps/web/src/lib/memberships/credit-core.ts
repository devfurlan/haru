// Consumo/estorno de crédito de assinatura de serviços, ATÔMICO. Importa só @haru/database
// (sem server-only/next) pra ser testável isolado - igual appointment-insert.ts.
//
// GUARDA DE CONCORRÊNCIA: o consumo é um UPDATE condicional (WHERE creditBalance >= cost).
// O row-lock do Postgres serializa consumidores concorrentes da MESMA Membership: de N
// reservas simultâneas cobertas, exatamente 1 desconta (as outras caem pra avulso). NÃO dá
// pra separar em findUnique(saldo) + update(decrement) - aí todos leem o mesmo saldo antes de
// qualquer commit e todos descontam (gasto-duplo). O advisory lock do insert é por
// (profissional, horário) e NÃO cobre isto (reservas em horários diferentes correm de fato).

import { type Prisma, prisma } from '@haru/database';

/**
 * Tenta descontar `creditCost` créditos da Membership DENTRO da transação `tx` (a mesma do
 * appointment.create), grava a linha REDEEM do ledger e liga o Appointment à Membership.
 * Retorna true se descontou (agendamento coberto), false se não havia saldo elegível (segue
 * avulso). Idempotente por agendamento: o @@unique([appointmentId, reason]) do ledger impede
 * débito dobrado se chamado duas vezes pro mesmo appointment.
 *
 * Elegibilidade re-checada no WHERE (não confia só no resolve, que rodou ANTES da tx): saldo
 * suficiente E assinatura que dá acesso a crédito = ACTIVE, ou CANCELED ainda dentro do
 * período já pago (regra: cancelou mas os créditos valem até o fim do ciclo). PAST_DUE/
 * PENDING/CANCELED-fora-do-período não descontam (créditos suspensos/vencidos).
 */
export async function consumeCreditInTx(
  tx: Prisma.TransactionClient,
  input: { membershipId: string; creditCost: number; appointmentId: string },
): Promise<boolean> {
  const { membershipId, creditCost, appointmentId } = input;

  const affected = await tx.$executeRaw`
    UPDATE "Membership"
    SET "creditBalance" = "creditBalance" - ${creditCost}, "updatedAt" = now()
    WHERE "id" = ${membershipId}
      AND "creditBalance" >= ${creditCost}
      AND ("status" = 'ACTIVE' OR ("status" = 'CANCELED' AND "currentPeriodEnd" > now()))`;
  if (affected !== 1) return false;

  await tx.membershipCreditLedger.create({
    data: { membershipId, delta: -creditCost, reason: 'REDEEM', appointmentId },
  });
  await tx.appointment.update({ where: { id: appointmentId }, data: { membershipId } });
  return true;
}

/**
 * Estorna o crédito de um agendamento coberto (cancelamento/no-show), SE o débito foi no
 * ciclo vigente - não ressuscita crédito de ciclo já renovado/expirado (senão daria crédito
 * de graça). Idempotente: limpar `Appointment.membershipId` e o @@unique([appointmentId,
 * 'REVERSAL']) impedem estorno dobrado. Fail-soft: o cancelamento nunca trava por causa disto.
 */
export async function refundMembershipCredit(appointmentId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id: appointmentId },
      select: { membershipId: true },
    });
    if (!appt?.membershipId) return; // não era coberto (ou já estornado: membershipId zerado)

    const redeem = await tx.membershipCreditLedger.findUnique({
      where: { appointmentId_reason: { appointmentId, reason: 'REDEEM' } },
      select: { delta: true, createdAt: true },
    });
    if (!redeem) return;

    const reversed = await tx.membershipCreditLedger.findUnique({
      where: { appointmentId_reason: { appointmentId, reason: 'REVERSAL' } },
      select: { id: true },
    });
    if (reversed) return;

    const membership = await tx.membership.findUnique({
      where: { id: appt.membershipId },
      select: { currentPeriodStart: true },
    });
    // Débito de ciclo anterior (já renovou/expirou): só desliga o link, sem devolver crédito.
    if (membership?.currentPeriodStart && redeem.createdAt < membership.currentPeriodStart) {
      await tx.appointment.update({ where: { id: appointmentId }, data: { membershipId: null } });
      return;
    }

    const amount = -redeem.delta; // delta do REDEEM é negativo
    await tx.membershipCreditLedger.create({
      data: { membershipId: appt.membershipId, delta: amount, reason: 'REVERSAL', appointmentId },
    });
    await tx.membership.update({
      where: { id: appt.membershipId },
      data: { creditBalance: { increment: amount } },
    });
    await tx.appointment.update({ where: { id: appointmentId }, data: { membershipId: null } });
  });
}
