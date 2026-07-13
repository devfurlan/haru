import 'server-only';

import { prisma } from '@haru/database';

import { notifyCreditsExpiring, notifyCreditsLowIfNeeded } from '@/lib/comms/subscription-events';

import { consumeCreditInTx } from './credit-core';
import { resolveCoveredMembership } from './credits';

// Quantos dias à frente liquidar as ocorrências de série (consumir "na data dela", com folga
// pra o cliente ver/pagar se ficar avulso). E antecedência do aviso de "créditos vencendo".
const SETTLE_AHEAD_DAYS = 3;
const EXPIRE_WARN_DAYS = 3;
const BATCH = 200;

/**
 * Liquida créditos das OCORRÊNCIAS DE SÉRIE que estão pra acontecer (janela SETTLE_AHEAD_DAYS):
 * consome 1 crédito por ocorrência coberta, na DATA dela - não na criação da série - pra
 * respeitar a recarga mensal (uma série de 12 vai consumindo conforme os créditos renovam).
 * Agnóstico a quem criou (cliente ou dono em nome do cliente). Ocorrência sem saldo fica avulsa
 * (membershipId=null) e sai da janela quando passa. Idempotente: só pega membershipId=null e o
 * consumo é atômico (consumeCreditInTx).
 */
export async function settleSeriesCredits(
  now = new Date(),
): Promise<{ settled: number; scanned: number }> {
  const horizon = new Date(now.getTime() + SETTLE_AHEAD_DAYS * 86_400_000);
  const candidates = await prisma.appointment.findMany({
    where: {
      seriesId: { not: null },
      membershipId: null,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: now, lte: horizon },
      contact: { customerAccountId: { not: null } },
    },
    select: { id: true, tenantId: true, contactId: true, serviceId: true },
    orderBy: { startsAt: 'asc' },
    take: BATCH,
  });

  let settled = 0;
  for (const appt of candidates) {
    try {
      const credit = await resolveCoveredMembership(
        appt.tenantId,
        appt.contactId,
        appt.serviceId,
        now,
      );
      if (!credit) continue; // sem cobertura/saldo: segue avulso
      const ok = await prisma.$transaction((tx) =>
        consumeCreditInTx(tx, {
          membershipId: credit.membershipId,
          creditCost: credit.creditCost,
          appointmentId: appt.id,
        }),
      );
      if (ok) {
        settled++;
        notifyCreditsLowIfNeeded(credit.membershipId).catch(() => {});
      }
    } catch (err) {
      console.error('[membership-sweep] settle occurrence failed', appt.id, err);
    }
  }
  return { settled, scanned: candidates.length };
}

/**
 * Avisa "créditos vencendo" pros planos SEM rollover, EXPIRE_WARN_DAYS antes do fim do ciclo,
 * com saldo > 0. Dedup por ciclo SEM campo novo: pega quem vence na janela de UM dia centrada
 * em `now + WARN_DAYS`; como o cron roda 1x/dia, cada assinatura cai nessa janela uma única vez
 * por ciclo. (Planos com rollover têm creditsExpireAt=null e não entram.)
 */
export async function settleExpiringReminders(now = new Date()): Promise<{ notified: number }> {
  const lo = new Date(now.getTime() + EXPIRE_WARN_DAYS * 86_400_000);
  const hi = new Date(lo.getTime() + 86_400_000);
  const due = await prisma.membership.findMany({
    where: {
      status: { in: ['ACTIVE', 'CANCELED'] },
      creditRollover: false,
      creditBalance: { gt: 0 },
      creditsExpireAt: { gte: lo, lt: hi },
    },
    select: { id: true },
    take: BATCH,
  });
  for (const m of due) {
    notifyCreditsExpiring(m.id).catch((err) =>
      console.error('[membership-sweep] notify expiring failed', m.id, err),
    );
  }
  return { notified: due.length };
}
