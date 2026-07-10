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
 * Um atendimento é avaliável quando o horário já passou e ele não foi cancelado nem
 * marcado como falta. NÃO exige que o dono clique "Atendido" (COMPLETED): dono que não
 * fecha atendimento no painel nunca liberaria a avaliação do cliente. Fonte única do
 * gate de avaliação (card do histórico, detalhe, página de avaliar); o gate de escrita
 * no server espelha esta mesma regra em SQL (ver canReview em lib/reviews.ts).
 */
export function isReviewable(appt: { startsAt: Date; status: AppointmentStatus }): boolean {
  return appt.startsAt < new Date() && appt.status !== 'CANCELED' && appt.status !== 'NO_SHOW';
}
