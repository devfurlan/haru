import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { buildBookingDays, type AvailableSlot } from '@haru/shared';

import { Skeleton } from '@/components/skeleton';
import { Text } from '@/components/text';

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };

type Props = {
  timezone: string;
  openWeekdays: number[];
  /** Deve ser memoizado (useCallback) pelo pai - é dependência do efeito. */
  loadSlots: (dateStr: string) => Promise<AvailableSlot[]>;
  /** Toque no horário = ação imediata (remarcar/reagendar tocam e agem). Ignorado se
   * `onSelectSlot` for passado (aí o horário fica selecionado e o pai confirma). */
  onConfirm?: (iso: string) => void;
  /** Modo "seleção persistente" (agendar, design 10): tocar só seleciona o horário
   * (fica coral); o pai renderiza o rodapé "Confirmar". Recebe `null` quando o usuário
   * troca de dia (pra o pai zerar a seleção pendente). */
  onSelectSlot?: (slot: AvailableSlot | null) => void;
  selectedSlot?: string | null;
  submitting: boolean;
  /** Rótulos das seções. Remarcar usa "Novo dia"/"Novo horário" (design 13c). */
  dayLabel?: string;
  timeLabel?: string;
};

// "sáb., 30/05" -> { weekday: "SÁB", day: "30" } para a célula de dia do design.
function dayParts(label: string) {
  const [wd = '', dm = ''] = label.split(', ');
  return {
    weekday: wd.replace(/\W/g, '').toUpperCase(),
    day: dm.split('/')[0] ?? '',
  };
}

// "15:30" -> "15h30"; "14:00" -> "14h" (formato do design/telas).
function fmtTime(hhmm: string) {
  return hhmm.replace(':', 'h').replace(/h00$/, 'h');
}

export function SlotPicker({
  timezone,
  openWeekdays,
  loadSlots,
  onConfirm,
  onSelectSlot,
  selectedSlot,
  submitting,
  dayLabel = 'Dia',
  timeLabel = 'Horário',
}: Props) {
  // Inclui dias fechados (open:false) - buildBookingDays já apara as pontas, então
  // days[0] é sempre atendível. Os fechados aparecem desabilitados/riscados (design 10).
  const days = buildBookingDays(timezone, new Set(openWeekdays));
  const [selectedDay, setSelectedDay] = useState<string | null>(days[0]?.value ?? null);
  // Guarda os slots junto do dia a que pertencem. `loading`/`slots` são DERIVADOS:
  // enquanto o dia buscado não for o selecionado, está carregando. Assim o effect só
  // faz setState no callback assíncrono (sem setState síncrono, sem flicker).
  const [fetched, setFetched] = useState<{ day: string; slots: AvailableSlot[] } | null>(null);

  useEffect(() => {
    if (!selectedDay) return;
    let active = true;
    loadSlots(selectedDay)
      .then((s) => active && setFetched({ day: selectedDay, slots: s }))
      .catch(() => active && setFetched({ day: selectedDay, slots: [] }));
    return () => {
      active = false;
    };
  }, [selectedDay, loadSlots]);

  const loadingSlots = fetched?.day !== selectedDay;
  const slots = fetched?.day === selectedDay ? fetched.slots : null;

  if (days.length === 0) {
    return (
      <Text className="text-muted text-sm">Este profissional não tem dias de atendimento.</Text>
    );
  }

  return (
    <View>
      {/* Dia: carrossel de células (dia da semana + número), esmeralda quando ativo. */}
      <Text className="text-ink text-[13px] font-semibold">{dayLabel}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-[9px] pb-1 pt-[11px]"
      >
        {days.map((day) => {
          const selected = day.value === selectedDay;
          const closed = !day.open;
          const { weekday, day: num } = dayParts(day.label);
          return (
            <Pressable
              key={day.value}
              disabled={closed}
              onPress={() => {
                if (day.value !== selectedDay) onSelectSlot?.(null); // troca de dia zera a seleção
                setSelectedDay(day.value);
              }}
              className={`relative w-[52px] items-center rounded-[14px] py-2.5 ${
                selected
                  ? 'bg-green-deep'
                  : closed
                    ? 'border border-[#e6dcc6] bg-[#f2ebda]'
                    : 'border-edge bg-paper border'
              }`}
            >
              <Text
                className={`text-[11px] font-medium ${
                  selected ? 'text-[#8fbfa4]' : closed ? 'text-[#b9ad93]' : 'text-sub'
                }`}
              >
                {weekday}
              </Text>
              <Text
                style={fraunces}
                className={`text-lg ${selected ? 'text-cream' : closed ? 'text-[#b9ad93]' : 'text-ink'}`}
              >
                {num}
              </Text>
              {/* Dia sem expediente: risco diagonal do design (rotate -18deg). */}
              {closed ? (
                <View
                  pointerEvents="none"
                  className="absolute left-[9px] right-[9px] top-1/2 h-[1.5px] bg-[#cbbf9f]"
                  style={{ transform: [{ rotate: '-18deg' }] }}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Horário: chips creme; toca e avança (o app confirma no próximo passo). */}
      <Text className="text-ink mt-5 text-[13px] font-semibold">{timeLabel}</Text>
      {loadingSlots ? (
        <View className="mt-[11px] flex-row flex-wrap gap-[9px]">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[42px] w-[76px] rounded-xl" />
          ))}
        </View>
      ) : slots && slots.length === 0 ? (
        <Text className="text-muted py-4 text-sm">Nenhum horário livre nesse dia.</Text>
      ) : (
        <View className="mt-[11px] flex-row flex-wrap gap-[9px]">
          {slots?.map((slot) => {
            const busy = slot.available === false; // horário ocupado: riscado, não clica
            const selected = onSelectSlot != null && slot.startsAtIso === selectedSlot;
            return (
              <Pressable
                key={slot.startsAtIso}
                disabled={busy || submitting}
                onPress={() =>
                  onSelectSlot ? onSelectSlot(slot) : onConfirm?.(slot.startsAtIso)
                }
                className={`w-[76px] items-center rounded-xl py-[11px] ${
                  busy
                    ? 'bg-[#f2ebda]'
                    : selected
                      ? 'bg-coral'
                      : 'border-edge bg-paper border active:border-coral active:bg-coral'
                }`}
              >
                <Text
                  className={`text-sm ${
                    busy
                      ? 'text-[#b9ad93] font-semibold line-through'
                      : selected
                        ? 'font-bold text-white'
                        : 'text-ink font-semibold'
                  }`}
                >
                  {fmtTime(slot.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
