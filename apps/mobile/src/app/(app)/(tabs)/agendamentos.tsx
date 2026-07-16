import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AppointmentCard } from '@/components/appointment-card';
import { Skeleton } from '@/components/skeleton';
import { TenantAvatar } from '@/components/tenant-avatar';
import { Text } from '@/components/text';
import { CalendarIcon } from '@/components/calendar-icon';
import { api, ApiError, type AppointmentItem, type AppointmentsData } from '@/lib/api';

const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesSemi = { fontFamily: 'Fraunces_600SemiBold' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };

// "21 jun" no fuso do tenant (linha compacta dos concluídos).
function shortDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: 'numeric', month: 'short' })
    .format(new Date(iso))
    .replace('.', '');
}

// Prévia "Concluídos" (design 12): últimos atendimentos com atalho pra reagendar.
function ConcluidosPreview({ items }: { items: AppointmentItem[] }) {
  return (
    <View className="mt-[22px]">
      <View className="flex-row items-center justify-between">
        <Text style={frauncesSemi} className="text-ink text-[15px]">
          Concluídos
        </Text>
        <View className="border-edge bg-paper flex-row items-center gap-1.5 rounded-full border px-[11px] py-1.5">
          <Text className="text-sub text-xs font-semibold">Últimos 30 dias</Text>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path d="M6 9l6 6 6-6" stroke="#7c8a80" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </View>
      {items.slice(0, 3).map((p) => (
        <Link key={p.id} href={`/appointment/${p.id}`} asChild>
          <Pressable className="mt-3 flex-row items-center gap-3 opacity-[0.85] active:opacity-60">
            <TenantAvatar name={p.tenant.name} logoUrl={p.tenant.logoUrl} size={44} radius={13} />
            <View className="flex-1">
              <Text className="text-ink text-sm font-semibold" numberOfLines={1}>
                {p.tenant.name}
              </Text>
              <Text className="text-sub text-[11.5px] font-medium" numberOfLines={1}>
                {p.serviceName} · {shortDate(p.startsAt, p.tenant.timezone)}
              </Text>
            </View>
            <Text className="text-green-deep text-[12px] font-bold">Reagendar</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

type Tab = 'upcoming' | 'past';

function ToggleTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-xl py-2.5 ${
        active ? 'bg-green-deep' : 'border-edge bg-paper border'
      }`}
    >
      <Text
        className={`text-[13.5px] ${active ? 'text-cream font-bold' : 'text-ink font-semibold'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AppointmentsScreen() {
  const [data, setData] = useState<AppointmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('upcoming');

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.appointments());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <View className="px-6 pb-1 pt-6">
        <Text style={fraunces} className="text-ink text-[28px] tracking-tight">
          Sua agenda
        </Text>
      </View>

      <View className="flex-row gap-2 px-6 pt-4">
        <ToggleTab
          label="Próximos"
          active={tab === 'upcoming'}
          onPress={() => setTab('upcoming')}
        />
        <ToggleTab label="Histórico" active={tab === 'past'} onPress={() => setTab('past')} />
      </View>

      {loading ? (
        <View className="px-6 pt-[18px]">
          {[0, 1, 2].map((i) => (
            <View key={i} className="border-line bg-paper mb-3 rounded-[18px] border p-3.5">
              <View className="flex-row items-center gap-3">
                <Skeleton className="h-[52px] w-[52px] rounded-[15px]" />
                <View className="flex-1 gap-2">
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-12 pt-[18px]"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0e7a45" />
          }
        >
          {error ? (
            <View className="mt-8 items-center">
              <Text className="text-destructive text-center text-sm">{error}</Text>
              <Pressable onPress={onRefresh} className="mt-3">
                <Text className="text-coral text-sm font-semibold">Tentar de novo</Text>
              </Pressable>
            </View>
          ) : list.length === 0 ? (
            <View className="mt-16 items-center px-6">
              <View className="bg-coral/10 mb-4 h-20 w-20 items-center justify-center rounded-full">
                <CalendarIcon size={34} />
              </View>
              <Text style={fraunces} className="text-ink text-center text-xl">
                Tá tudo <Text style={frauncesItalic} className="text-green-deep">livre</Text>
              </Text>
              <Text className="text-muted mt-2 text-center text-base leading-6">
                {tab === 'upcoming'
                  ? 'Encontre um estabelecimento e agende - vai aparecer tudo por aqui.'
                  : 'Seus agendamentos anteriores vão aparecer por aqui.'}
              </Text>
              {tab === 'upcoming' && (
                <Link href="/buscar" asChild>
                  <Pressable className="bg-coral mt-6 items-center rounded-2xl px-6 py-4 active:opacity-90">
                    <Text className="text-[15px] font-bold text-white">
                      Buscar estabelecimento
                    </Text>
                  </Pressable>
                </Link>
              )}
            </View>
          ) : (
            <>
              <View className="gap-3">
                {list.map((item, i) => (
                  <AppointmentCard
                    key={item.id}
                    item={item}
                    first={i === 0}
                    reviewRating={data?.reviews?.[item.tenant.id] ?? null}
                  />
                ))}
              </View>
              {tab === 'upcoming' && past.length > 0 ? <ConcluidosPreview items={past} /> : null}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
