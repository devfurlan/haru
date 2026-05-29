import type { AppointmentStatus } from '@haru/database';

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELED: 'Cancelado',
  COMPLETED: 'Atendido',
  NO_SHOW: 'Não compareceu',
};

export const STATUS_STYLE: Record<AppointmentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  CONFIRMED: 'bg-emerald-100 text-emerald-900',
  CANCELED: 'bg-zinc-100 text-zinc-600 line-through',
  COMPLETED: 'bg-blue-100 text-blue-900',
  NO_SHOW: 'bg-rose-100 text-rose-900',
};
