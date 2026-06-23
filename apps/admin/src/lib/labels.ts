import type { SubscriptionStatus } from '@haru/database';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Em atraso',
  SUSPENDED: 'Suspensa',
  CANCELED: 'Cancelada',
};

export const STATUS_VARIANT: Record<SubscriptionStatus, BadgeVariant> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  SUSPENDED: 'danger',
  CANCELED: 'neutral',
};
