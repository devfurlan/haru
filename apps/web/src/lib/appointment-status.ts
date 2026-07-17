import type { AppointmentStatus } from '@haru/database';

import { isRealized } from './metrics/metrics-core';

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
 * Um atendimento "aconteceu" (compareceu / foi realizado) quando JÁ TERMINOU e não foi
 * cancelado nem marcado como falta. Alias fino da regra canônica `isRealized` (lib/metrics/
 * metrics-core.ts) - fonte ÚNICA no sistema. Usa `endsAt` de propósito: cobre a janela entre
 * o fim do atendimento e o cron de fechamento (que só roda no fim do dia) sem depender de o
 * status já ter virado COMPLETED; depois do cron, status e esta regra convergem. O gate de
 * escrita de avaliação no server espelha esta regra em SQL (ver canReview em lib/reviews.ts);
 * lapsed-clients repete em isVisit (opera sobre um `now` já capturado).
 */
export function isAttended(
  appt: { endsAt: Date; status: AppointmentStatus },
  now: Date = new Date(),
): boolean {
  return isRealized(appt, now);
}

/** Avaliável = já foi realizado. Alias semântico de isAttended pro gate de review. */
export const isReviewable = isAttended;
