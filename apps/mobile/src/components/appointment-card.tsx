import { Link, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import type { AppointmentItem } from '@/lib/api';

import { TenantAvatar } from './tenant-avatar';

// Confirmado/A confirmar usam o chip verde claro do design; cancelado/não compareceu
// ficam num tom neutro/destrutivo. Realizado fica neutro.
const STATUS_LABEL: Record<AppointmentItem['status'], { text: string; bg: string; fg: string }> = {
  PENDING: { text: 'A confirmar', bg: 'bg-chip', fg: 'text-green-deep' },
  CONFIRMED: { text: 'confirmado', bg: 'bg-chip', fg: 'text-green-deep' },
  CANCELED: { text: 'cancelado', bg: 'bg-ink/5', fg: 'text-muted' },
  COMPLETED: { text: 'realizado', bg: 'bg-ink/5', fg: 'text-sub' },
  NO_SHOW: { text: 'não compareceu', bg: 'bg-destructive/10', fg: 'text-destructive' },
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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AppointmentCard({
  item,
  first,
  reviewRating,
}: {
  item: AppointmentItem;
  first?: boolean;
  /** Nota que o cliente já deu a este estabelecimento (null = ainda não avaliou). */
  reviewRating?: number | null;
}) {
  const status = STATUS_LABEL[item.status];
  const { day, month, weekday, time } = parts(item.startsAt, item.tenant.timezone);
  const dim = item.status === 'CANCELED' || item.isPast;

  // Avaliável = já realizado (terminou, não cancelado/falta). Gate canônico do motor (endsAt),
  // computado no servidor (item.isReviewable) - não recalcular com startsAt aqui.
  const reviewable = item.isReviewable;

  // "Sáb, 5 jul · 15h30"
  const whenLine = `${cap(weekday)}, ${Number(day)} ${month} · ${time.replace(':', 'h')}`;

  return (
    <Link href={`/appointment/${item.id}`} asChild>
      <Pressable
        style={first ? cardShadow : undefined}
        className={`border-line bg-paper rounded-[18px] border p-3.5 active:opacity-80 ${
          dim ? 'opacity-60' : ''
        }`}
      >
        {/* Linha 1: negócio + serviço + status */}
        <View className="flex-row items-center gap-3">
          <TenantAvatar
            name={item.tenant.name}
            logoUrl={item.tenant.logoUrl}
            size={52}
            radius={15}
          />

          <View className="flex-1">
            <Text
              style={{ fontFamily: 'Fraunces_600SemiBold' }}
              className="text-ink text-base"
              numberOfLines={1}
            >
              {item.tenant.name}
            </Text>
            <Text className="text-sub mt-0.5 text-xs font-medium" numberOfLines={1}>
              {item.serviceName}
              {item.professionalName ? ` · com ${item.professionalName}` : ''}
            </Text>
          </View>

          <View className={`rounded-full px-2.5 py-[5px] ${status.bg}`}>
            <Text className={`text-[11px] font-bold ${status.fg}`}>{status.text}</Text>
          </View>
        </View>

        {/* Divisória */}
        <View className="border-line mt-3 border-t pt-3">
          <View className="flex-row items-center justify-between">
            <Text
              style={{ fontFamily: 'Fraunces_600SemiBold' }}
              className="text-green-deep text-[17px]"
            >
              {whenLine}
            </Text>
            {reviewable && reviewRating != null ? (
              <Text className="text-sub text-[12.5px] font-bold">
                ★ {reviewRating},0 · sua nota
              </Text>
            ) : reviewable ? (
              <Link href={`/avaliar/${item.id}` as Href} asChild>
                <Pressable
                  hitSlop={6}
                  className="bg-coral rounded-full px-3 py-1.5 active:opacity-80"
                >
                  <Text className="text-[12px] font-bold text-white">Avaliar</Text>
                </Pressable>
              </Link>
            ) : (
              <Text className="text-coral text-[13px] font-bold">Ver</Text>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
