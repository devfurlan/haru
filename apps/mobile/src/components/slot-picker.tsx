import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { buildBookingDays, type AvailableSlot } from '@haru/shared';

type Props = {
  timezone: string;
  openWeekdays: number[];
  /** Deve ser memoizado (useCallback) pelo pai - é dependência do efeito. */
  loadSlots: (dateStr: string) => Promise<AvailableSlot[]>;
  onConfirm: (iso: string) => void;
  submitting: boolean;
};

export function SlotPicker({ timezone, openWeekdays, loadSlots, onConfirm, submitting }: Props) {
  const days = buildBookingDays(timezone, new Set(openWeekdays)).filter((d) => d.open);
  const [selectedDay, setSelectedDay] = useState<string | null>(days[0]?.value ?? null);
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!selectedDay) return;
    let active = true;
    setLoadingSlots(true);
    setSlots(null);
    loadSlots(selectedDay)
      .then((s) => active && setSlots(s))
      .catch(() => active && setSlots([]))
      .finally(() => active && setLoadingSlots(false));
    return () => {
      active = false;
    };
  }, [selectedDay, loadSlots]);

  if (days.length === 0) {
    return <Text className="text-sm text-muted">Este profissional não tem dias de atendimento.</Text>;
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pb-3"
      >
        {days.map((day) => {
          const selected = day.value === selectedDay;
          return (
            <Pressable
              key={day.value}
              onPress={() => setSelectedDay(day.value)}
              className={`rounded-xl border px-3 py-2 ${
                selected ? 'border-coral bg-coral' : 'border-ink/10 bg-paper'
              }`}
            >
              <Text
                className={`text-sm capitalize ${selected ? 'text-white' : 'text-ink-soft'}`}
              >
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loadingSlots ? (
        <View className="items-center py-6">
          <ActivityIndicator color="#0e7a45" />
        </View>
      ) : slots && slots.length === 0 ? (
        <Text className="py-4 text-sm text-muted">Nenhum horário livre nesse dia.</Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {slots?.map((slot) => (
            <Pressable
              key={slot.startsAtIso}
              disabled={submitting}
              onPress={() => onConfirm(slot.startsAtIso)}
              className="rounded-xl border border-green/30 bg-green/5 px-4 py-2 active:opacity-60"
            >
              <Text className="text-sm font-medium text-green-deep">{slot.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
