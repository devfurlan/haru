import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatBRL } from '@haru/shared';

import type { AppointmentItem } from '@/lib/api';

const STATUS_LABEL: Record<AppointmentItem['status'], { text: string; bg: string; fg: string }> = {
  PENDING: { text: 'A confirmar', bg: 'bg-coral-soft/20', fg: 'text-coral' },
  CONFIRMED: { text: 'Confirmado', bg: 'bg-green/10', fg: 'text-green' },
  CANCELED: { text: 'Cancelado', bg: 'bg-ink/5', fg: 'text-muted' },
  COMPLETED: { text: 'Realizado', bg: 'bg-ink/5', fg: 'text-ink-soft' },
  NO_SHOW: { text: 'Não compareceu', bg: 'bg-destructive/10', fg: 'text-destructive' },
};

export function AppointmentCard({ item }: { item: AppointmentItem }) {
  const status = STATUS_LABEL[item.status];
  return (
    <Link href={`/appointment/${item.id}`} asChild>
      <Pressable className="border-ink/10 bg-paper mb-3 rounded-2xl border p-4 active:opacity-70">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-ink text-base font-semibold" numberOfLines={1}>
            {item.serviceName}
          </Text>
          <Text className="text-coral text-sm font-semibold">{formatBRL(item.priceCents)}</Text>
        </View>
        <Text className="text-muted text-sm" numberOfLines={1}>
          {item.tenant.name}
          {item.professionalName ? ` · ${item.professionalName}` : ''}
        </Text>
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-ink-soft text-sm capitalize">{item.whenLabel}</Text>
          <View className={`rounded-full px-2 py-0.5 ${status.bg}`}>
            <Text className={`text-xs font-medium ${status.fg}`}>{status.text}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
