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
