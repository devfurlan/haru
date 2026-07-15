import type { AppointmentStatus } from '@haru/database';

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELED: 'Cancelado',
  COMPLETED: 'Atendido',
  NO_SHOW: 'Não compareceu',
};

export const STATUS_STYLE: Record<AppointmentStatus, string> = {
  PENDING: 'bg-coral-tint text-coral-deep',
  CONFIRMED: 'bg-chip text-green-emph',
  CANCELED: 'bg-cream-2 text-ink-30 line-through',
  COMPLETED: 'bg-cream-2 text-ink-70',
  NO_SHOW: 'bg-coral-tint text-coral-deep',
};

/**
 * Um atendimento "aconteceu" (compareceu) quando o horário já passou e ele não foi cancelado
 * nem marcado como falta. NÃO exige COMPLETED de propósito: cobre a janela entre o fim do
 * atendimento e o cron de fechamento (que só roda no fim do dia) - nela o status ainda é
 * PENDING/CONFIRMED e um teste `=== COMPLETED` daria falso-negativo. Depois do cron, status e
 * esta heurística convergem (o passado vira COMPLETED). Fonte única de "compareceu": gate de
 * avaliação (isReviewable) e receita realizada (isAttended). O gate de escrita de avaliação no
 * server espelha esta regra em SQL (ver canReview em lib/reviews.ts); lapsed-clients repete em
 * isVisit (opera sobre um `now` já capturado).
 */
export function isAttended(
  appt: { startsAt: Date; status: AppointmentStatus },
  now: Date = new Date(),
): boolean {
  return appt.startsAt < now && appt.status !== 'CANCELED' && appt.status !== 'NO_SHOW';
}

/** Avaliável = já compareceu. Alias semântico de isAttended pro gate de review. */
export const isReviewable = isAttended;
