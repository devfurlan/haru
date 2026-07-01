import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatBRL, formatDuration } from '@haru/shared';

import { SlotPicker } from '@/components/slot-picker';
import { api, ApiError, type AppointmentItem } from '@/lib/api';

type Mode = 'view' | 'reschedule' | 'rebook';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<AppointmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .appointments()
      .then(({ upcoming, past }) => {
        if (!active) return;
        const found = [...upcoming, ...past].find((a) => a.id === id) ?? null;
        setItem(found);
        if (!found) setError('Agendamento não encontrado');
      })
      .catch((err) => active && setError(err instanceof ApiError ? err.message : 'Erro ao carregar'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const loadSlots = useCallback(
    (dateStr: string) => {
      if (!item) return Promise.resolve([]);
      const fetcher =
        mode === 'reschedule'
          ? api.rescheduleSlots(id, item.serviceId, dateStr)
          : api.rebookSlots(id, item.serviceId, dateStr);
      return fetcher.then((r) => r.slots);
    },
    [id, item, mode],
  );

  function confirmCancel() {
    Alert.alert('Cancelar agendamento', 'Tem certeza que quer cancelar?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar agendamento',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await api.cancel(id);
            router.back();
          } catch (err) {
            Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível cancelar');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  }

  async function handlePickSlot(iso: string) {
    setSubmitting(true);
    try {
      if (mode === 'reschedule') {
        await api.reschedule(id, iso);
        Alert.alert('Pronto', 'Agendamento remarcado.');
      } else {
        await api.rebook(id, iso);
        Alert.alert('Pronto', 'Novo horário agendado.');
      }
      router.back();
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível concluir');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-4 pb-2 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="py-1 pr-3">
          <Text className="text-base text-coral">‹ Voltar</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0e7a45" />
        </View>
      ) : !item ? (
        <Text className="px-6 pt-6 text-sm text-destructive">{error ?? 'Não encontrado'}</Text>
      ) : (
        <ScrollView className="flex-1 px-6" contentContainerClassName="pb-10">
          <Text className="text-2xl font-bold text-ink">{item.serviceName}</Text>
          <Text className="mt-1 text-base text-muted">{item.tenant.name}</Text>

          <View className="mt-5 rounded-2xl border border-ink/10 bg-paper p-4">
            <Row label="Quando" value={item.whenLabel} />
            <Row label="Duração" value={formatDuration(item.durationMinutes)} />
            <Row label="Valor" value={formatBRL(item.priceCents)} />
            {item.professionalName ? <Row label="Profissional" value={item.professionalName} /> : null}
          </View>

          {mode === 'view' ? (
            <View className="mt-6 gap-3">
              {item.isActive && (
                <>
                  <Pressable
                    onPress={() => setMode('reschedule')}
                    className="items-center rounded-xl bg-coral py-4 active:opacity-80"
                  >
                    <Text className="text-base font-semibold text-white">Remarcar</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmCancel}
                    disabled={submitting}
                    className="items-center rounded-xl border border-destructive/40 py-4 active:opacity-60"
                  >
                    <Text className="text-base font-semibold text-destructive">
                      Cancelar agendamento
                    </Text>
                  </Pressable>
                </>
              )}
              <Pressable
                onPress={() => setMode('rebook')}
                className="items-center rounded-xl border border-green/40 py-4 active:opacity-60"
              >
                <Text className="text-base font-semibold text-green">Agendar de novo</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-6">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-ink">
                  {mode === 'reschedule' ? 'Escolha o novo horário' : 'Escolha um horário'}
                </Text>
                <Pressable onPress={() => setMode('view')} hitSlop={8}>
                  <Text className="text-sm text-muted">Cancelar</Text>
                </Pressable>
              </View>
              <SlotPicker
                timezone={item.tenant.timezone}
                openWeekdays={item.openWeekdays}
                loadSlots={loadSlots}
                onConfirm={handlePickSlot}
                submitting={submitting}
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-ink/5 py-2 last:border-0">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-medium capitalize text-ink">{value}</Text>
    </View>
  );
}
