import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppointmentCard } from '@/components/appointment-card';
import { api, ApiError, type AppointmentsData } from '@/lib/api';
import { signOut } from '@/lib/auth';

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

  // Recarrega ao focar (inclui voltar do detalhe após cancelar/remarcar).
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

  const isEmpty = data && data.upcoming.length === 0 && data.past.length === 0;

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <View className="px-6 pb-2 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-ink text-2xl font-bold">Meus agendamentos</Text>
          <Pressable onPress={() => signOut()} hitSlop={8}>
            <Text className="text-muted text-sm font-medium">Sair</Text>
          </Pressable>
        </View>
        <Link href="/buscar" asChild>
          <Pressable className="bg-coral mt-3 items-center rounded-xl py-3 active:opacity-80">
            <Text className="text-sm font-semibold text-white">＋ Agendar em um negócio</Text>
          </Pressable>
        </Link>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0e7a45" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          contentContainerClassName="pb-10"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <Text className="text-destructive mt-4 text-sm">{error}</Text>
          ) : isEmpty ? (
            <Text className="text-muted mt-16 text-center text-base">
              Quando você agendar com o mesmo WhatsApp, seus horários aparecem aqui.
            </Text>
          ) : (
            <>
              {data!.upcoming.length > 0 && (
                <>
                  <Text className="text-muted mb-2 mt-4 text-sm font-semibold uppercase tracking-wide">
                    Próximos
                  </Text>
                  {data!.upcoming.map((item) => (
                    <AppointmentCard key={item.id} item={item} />
                  ))}
                </>
              )}
              {data!.past.length > 0 && (
                <>
                  <Text className="text-muted mb-2 mt-6 text-sm font-semibold uppercase tracking-wide">
                    Anteriores
                  </Text>
                  {data!.past.map((item) => (
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
