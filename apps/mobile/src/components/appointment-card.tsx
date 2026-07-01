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

const cardShadow = {
  shadowColor: '#0a3324',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

function parts(iso: string, tz: string) {
  const d = new Date(iso);
  const f = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz, ...opts }).format(d).replace('.', '');
  return {
    day: f({ day: '2-digit' }),
    month: f({ month: 'short' }),
    weekday: f({ weekday: 'short' }),
    time: f({ hour: '2-digit', minute: '2-digit' }),
  };
}

export function AppointmentCard({ item }: { item: AppointmentItem }) {
  const status = STATUS_LABEL[item.status];
  const { day, month, weekday, time } = parts(item.startsAt, item.tenant.timezone);
  const dim = item.status === 'CANCELED' || item.isPast;

  return (
    <Link href={`/appointment/${item.id}`} asChild>
      <Pressable
        style={cardShadow}
        className={`mb-3 flex-row items-center gap-4 rounded-2xl bg-paper p-4 active:opacity-80 ${
          dim ? 'opacity-60' : ''
        }`}
      >
        {/* Chip de data */}
        <View className="bg-coral/10 h-16 w-16 items-center justify-center rounded-2xl">
          <Text className="text-coral text-xl font-bold leading-6">{day}</Text>
          <Text className="text-coral text-xs font-semibold uppercase">{month}</Text>
        </View>

        {/* Conteúdo */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-ink flex-1 text-base font-semibold" numberOfLines={1}>
              {item.serviceName}
            </Text>
            <Text className="text-ink-soft ml-2 text-sm font-semibold">
              {formatBRL(item.priceCents)}
            </Text>
          </View>

          <Text className="text-muted mt-0.5 text-sm" numberOfLines={1}>
            {item.tenant.name}
            {item.professionalName ? ` · ${item.professionalName}` : ''}
          </Text>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-ink-soft text-sm capitalize">
              {weekday} · {time}
            </Text>
            <View className={`rounded-full px-2.5 py-1 ${status.bg}`}>
              <Text className={`text-xs font-semibold ${status.fg}`}>{status.text}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
