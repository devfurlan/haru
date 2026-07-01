import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppointmentCard } from '@/components/appointment-card';
import { CalendarIcon } from '@/components/calendar-icon';
import { api, ApiError, type AppointmentsData } from '@/lib/api';
import { signOut } from '@/lib/auth';

const fraunces = { fontFamily: 'Fraunces_700Bold' };

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-muted mb-2 mt-6 text-xs font-bold uppercase tracking-widest">
      {children}
    </Text>
  );
}

export default function AppointmentsScreen() {
  const [data, setData] = useState<AppointmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const isEmpty = upcoming.length === 0 && past.length === 0;

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-end justify-between px-6 pb-4 pt-3">
        <View>
          <Text className="text-muted text-sm">Olá 👋</Text>
          <Text style={fraunces} className="text-ink text-3xl">
            Agendamentos
          </Text>
        </View>
        <Pressable onPress={() => signOut()} hitSlop={10} className="pb-1">
          <Text className="text-muted text-sm font-medium">Sair</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0e7a45" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-12"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0e7a45" />
          }
        >
          {/* CTA agendar */}
          <Link href="/buscar" asChild>
            <Pressable
              className="bg-coral mb-2 flex-row items-center justify-center gap-2 rounded-2xl py-4 active:opacity-90"
              style={{
                shadowColor: '#ff5a36',
                shadowOpacity: 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 3,
              }}
            >
              <Text className="text-lg font-bold text-white">＋</Text>
              <Text className="text-base font-semibold text-white">Agendar em um negócio</Text>
            </Pressable>
          </Link>

          {error ? (
            <View className="mt-8 items-center">
              <Text className="text-destructive text-center text-sm">{error}</Text>
              <Pressable onPress={onRefresh} className="mt-3">
                <Text className="text-coral text-sm font-semibold">Tentar de novo</Text>
              </Pressable>
            </View>
          ) : isEmpty ? (
            <View className="mt-16 items-center px-6">
              <View className="bg-coral/10 mb-4 h-20 w-20 items-center justify-center rounded-full">
                <CalendarIcon size={34} />
              </View>
              <Text style={fraunces} className="text-ink text-center text-xl">
                Nenhum agendamento ainda
              </Text>
              <Text className="text-muted mt-2 text-center text-base leading-6">
                Agende no seu negócio favorito e acompanhe tudo por aqui.
              </Text>
            </View>
          ) : (
            <>
              {upcoming.length > 0 && (
                <>
                  <SectionTitle>Próximos</SectionTitle>
                  {upcoming.map((item) => (
                    <AppointmentCard key={item.id} item={item} />
                  ))}
                </>
              )}
              {past.length > 0 && (
                <>
                  <SectionTitle>Anteriores</SectionTitle>
                  {past.map((item) => (
                    <AppointmentCard key={item.id} item={item} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
