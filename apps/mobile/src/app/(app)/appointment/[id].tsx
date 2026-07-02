import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/text';

import { formatBRL, formatDuration } from '@haru/shared';

import { BookingSuccess } from '@/components/booking-success';
import { CancelSheet } from '@/components/cancel-sheet';
import { PressScale } from '@/components/press-scale';
import { SlotPicker } from '@/components/slot-picker';
import { TenantAvatar } from '@/components/tenant-avatar';
import { api, ApiError, type AppointmentItem } from '@/lib/api';

type Mode = 'view' | 'reschedule' | 'rebook';

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };

const STATUS_LABEL: Record<AppointmentItem['status'], string> = {
  PENDING: 'pendente',
  CONFIRMED: 'confirmado',
  CANCELED: 'cancelado',
  COMPLETED: 'concluído',
  NO_SHOW: 'não compareceu',
};

// "Sáb, 5 jul · 15h30" a partir do ISO no fuso do estabelecimento.
function formatWhen(iso: string, tz: string) {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz, ...o }).format(d).replace('.', '');
  const wd = f({ weekday: 'short' });
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${f({ day: 'numeric' })} ${f({ month: 'short' })} · ${f({ hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}`;
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<AppointmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [pickedIso, setPickedIso] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [result, setResult] = useState<{
    plain?: string;
    accent: string;
    message: string;
    when?: string;
    previousWhen?: string;
    icon?: 'check' | 'refresh' | 'x';
  } | null>(null);
  const insets = useSafeAreaInsets();

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

  // Trocar de modo (ver/remarcar/reagendar) zera o horário pendente do rodapé.
  useEffect(() => {
    setPickedIso(null);
  }, [mode]);

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

  async function doCancel() {
    if (!item) return;
    setSubmitting(true);
    try {
      await api.cancel(id);
      setCancelOpen(false);
      setResult({
        plain: 'Agendamento',
        accent: 'cancelado',
        message: `O horário foi liberado e avisamos ${item.tenant.name}. Sem cobrança dessa vez.`,
        icon: 'x',
      });
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível cancelar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePickSlot(iso: string) {
    if (!item) return;
    setSubmitting(true);
    try {
      if (mode === 'reschedule') {
        const previousWhen = item.whenLabel;
        await api.reschedule(id, iso);
        setResult({
          plain: 'Novo horário',
          accent: 'confirmado',
          message: 'Avisamos a barbearia. A confirmação foi pro seu WhatsApp e e-mail.',
          when: formatWhen(iso, item.tenant.timezone),
          previousWhen,
          icon: 'refresh',
        });
      } else {
        await api.rebook(id, iso);
        setResult({
          accent: 'Agendado!',
          message: 'Novo horário confirmado. Enviamos os detalhes pro seu WhatsApp e e-mail.',
          when: formatWhen(iso, item.tenant.timezone),
        });
      }
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível concluir');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1">
      <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      {/* Header: voltar + título (muda para "Remarcar"/"Agendar de novo" nos fluxos). */}
      <View className="flex-row items-center gap-3 px-[22px] pb-1 pt-6">
        <Pressable
          onPress={() => (mode === 'view' ? router.back() : setMode('view'))}
          hitSlop={8}
          className="bg-paper border-edge h-10 w-10 items-center justify-center rounded-[13px] border active:opacity-70"
        >
          <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5l-7 7 7 7" stroke="#0a3324" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        {mode === 'view' ? (
          <Text style={fraunces} className="text-ink text-[15px]">
            Agendamento
          </Text>
        ) : (
          <View className="flex-1">
            <Text className="text-ink text-[14px] font-semibold">
              {mode === 'reschedule' ? 'Remarcar' : 'Agendar de novo'}
            </Text>
            {item ? (
              <Text className="text-sub text-[11.5px] font-medium" numberOfLines={1}>
                {item.tenant.name}
                {item.professionalName ? ` · com ${item.professionalName}` : ''}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0e7a45" />
        </View>
      ) : !item ? (
        <Text className="text-destructive px-6 pt-6 text-sm">{error ?? 'Não encontrado'}</Text>
      ) : (
        <>
        <ScrollView className="flex-1" contentContainerClassName="px-[22px] pb-8 pt-[18px]">
          {/* No modo view mostra o detalhe (hero + dados); na remarcação, só o seletor. */}
          {mode === 'view' && (
          <>
          {/* HERO escuro */}
          <View className="bg-green-deep overflow-hidden rounded-[22px] px-[18px] pb-4 pt-[18px]">
            {/* profundidade sutil no canto (aproxima o gradiente radial do mockup) */}
            <View className="bg-green-bright/10 absolute -right-6 -top-10 h-32 w-40 rounded-full" />

            <View className="flex-row items-center gap-3">
              <TenantAvatar
                name={item.tenant.name}
                logoUrl={item.tenant.logoUrl}
                size={50}
                radius={15}
              />
              <View className="flex-1">
                <Text style={fraunces} className="text-paper text-[17px]" numberOfLines={1}>
                  {item.tenant.name}
                </Text>
                <Text className="mt-0.5 text-xs text-[#8fbfa4]" numberOfLines={1}>
                  {item.serviceName}
                  {item.professionalName ? ` · com ${item.professionalName}` : ''}
                </Text>
              </View>
              <View
                className={
                  item.isActive
                    ? 'bg-green-bright rounded-full px-2.5 py-1'
                    : 'rounded-full bg-white/10 px-2.5 py-1'
                }
              >
                <Text
                  className={
                    item.isActive
                      ? 'text-green-deep text-[11px] font-bold'
                      : 'text-[11px] font-bold text-[#8fbfa4]'
                  }
                >
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>

            {/* divisória tracejada */}
            <View className="my-[15px] h-px border-t border-dashed border-[rgba(143,191,164,0.4)]" />

            <View className="flex-row justify-between">
              <View>
                <Text className="text-[11px] uppercase tracking-[0.1em] text-[#8fbfa4]">Quando</Text>
                <Text style={fraunces} className="text-cream mt-1 text-[17px] capitalize">
                  {item.whenLabel}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[11px] uppercase tracking-[0.1em] text-[#8fbfa4]">Valor</Text>
                <Text style={fraunces} className="text-coral mt-1 text-[17px]">
                  {formatBRL(item.priceCents)}
                </Text>
              </View>
            </View>
          </View>

          {/* Card claro: duração + profissional (mapa do mockup omitido - sem endereço na API) */}
          <View className="bg-paper border-line mt-[14px] rounded-[18px] border px-[15px] py-1">
            <Row
              label="Duração"
              value={formatDuration(item.durationMinutes)}
              last={!item.professionalName}
            />
            {item.professionalName ? (
              <Row label="Profissional" value={item.professionalName} last />
            ) : null}
          </View>
          </>
          )}

          {mode !== 'view' && (
            <View>
              {/* Horário atual (só na remarcação, design 13c) */}
              {mode === 'reschedule' ? (
                <View className="mb-5 flex-row items-center gap-[11px] rounded-[15px] border border-[#e6dcc6] bg-[#f4ede0] px-[13px] py-[11px]">
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"
                      stroke="#7c8a80"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <View className="flex-1">
                    <Text className="text-ink text-[13.5px] font-semibold">Horário atual</Text>
                    <Text className="text-sub text-xs capitalize">{item.whenLabel}</Text>
                  </View>
                  <View className="border-edge bg-paper rounded-full border px-2.5 py-1">
                    <Text className="text-sub text-[11px] font-bold">trocar</Text>
                  </View>
                </View>
              ) : null}
              <SlotPicker
                timezone={item.tenant.timezone}
                openWeekdays={item.openWeekdays}
                loadSlots={loadSlots}
                selectedSlot={pickedIso}
                onSelectSlot={(slot) => setPickedIso(slot?.startsAtIso ?? null)}
                submitting={submitting}
                dayLabel={mode === 'reschedule' ? 'Novo dia' : 'Dia'}
                timeLabel={mode === 'reschedule' ? 'Novo horário' : 'Horário'}
              />
            </View>
          )}
        </ScrollView>

        {/* Rodapé fixo de ação (modo view) - oculto sob o overlay de sucesso/cancelado. */}
        {mode === 'view' && !result && (
          <View
            className="bg-cream border-line gap-2.5 border-t px-[22px] pt-3.5"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            {item.isActive && (
              <>
                <PressScale
                  onPress={() => setMode('reschedule')}
                  className="border-green-deep bg-cream items-center rounded-[15px] border py-4 active:opacity-70"
                >
                  <Text className="text-green-deep text-[15px] font-bold">Remarcar</Text>
                </PressScale>
                <Pressable
                  onPress={() => setCancelOpen(true)}
                  className="items-center py-1.5 active:opacity-60"
                >
                  <Text className="text-coral text-sm font-bold">Cancelar agendamento</Text>
                </Pressable>
              </>
            )}
            {!item.isActive && (
              <PressScale
                onPress={() => setMode('rebook')}
                className="border-edge bg-paper items-center rounded-[15px] border py-4 active:opacity-70"
              >
                <Text className="text-green-deep text-[15px] font-bold">Agendar de novo</Text>
              </PressScale>
            )}
          </View>
        )}

        {/* Rodapé de confirmação da remarcação/reagendamento (mesmo padrão do agendar). */}
        {mode !== 'view' && pickedIso && !result ? (
          <View
            className="bg-cream border-line flex-row items-center gap-3.5 border-t px-[22px] pt-3.5"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="flex-1">
              <Text className="text-sub text-[11.5px]" numberOfLines={1}>
                {mode === 'reschedule'
                  ? `De ${item.whenLabel.split('· ').pop()} → ${formatWhen(pickedIso, item.tenant.timezone)}`
                  : formatWhen(pickedIso, item.tenant.timezone)}
              </Text>
              <Text style={fraunces} className="text-ink text-[20px]">
                {formatBRL(item.priceCents)}
              </Text>
            </View>
            <PressScale
              onPress={() => handlePickSlot(pickedIso)}
              disabled={submitting}
              className="bg-coral items-center rounded-2xl px-8 py-4 active:opacity-90"
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-[15px] font-bold text-white">
                  {mode === 'reschedule' ? 'Remarcar' : 'Confirmar'}
                </Text>
              )}
            </PressScale>
          </View>
        ) : null}
        </>
      )}
      </SafeAreaView>

      {result && item ? (
        <BookingSuccess
          titlePlain={result.plain}
          titleAccent={result.accent}
          icon={result.icon}
          showCard={result.icon !== 'x'}
          previousWhen={result.previousWhen}
          message={result.message}
          tenant={{ name: item.tenant.name, logoUrl: item.tenant.logoUrl }}
          line={`${item.serviceName}${item.professionalName ? ` · com ${item.professionalName}` : ''}`}
          when={result.when}
          price={formatBRL(item.priceCents)}
        >
          {result.icon === 'x' ? (
            <>
              <PressScale
                onPress={() => {
                  setResult(null);
                  setMode('rebook');
                }}
                className="bg-coral items-center rounded-2xl py-4 active:opacity-90"
              >
                <Text className="text-[15px] font-bold text-white">Marcar de novo</Text>
              </PressScale>
              <PressScale
                onPress={() => router.back()}
                className="items-center rounded-2xl border border-[rgba(250,245,234,0.24)] py-4 active:opacity-70"
              >
                <Text className="text-cream text-[15px] font-bold">Voltar pra agenda</Text>
              </PressScale>
            </>
          ) : (
            <PressScale
              onPress={() => router.back()}
              className="bg-coral items-center rounded-2xl py-4 active:opacity-90"
            >
              <Text className="text-[15px] font-bold text-white">
                {result.icon === 'refresh' ? 'Ver na agenda' : 'Voltar pra minha agenda'}
              </Text>
            </PressScale>
          )}
        </BookingSuccess>
      ) : null}

      {item ? (
        <CancelSheet
          visible={cancelOpen}
          whenLabel={item.whenLabel}
          tenantName={item.tenant.name}
          submitting={submitting}
          onConfirm={doCancel}
          onReschedule={() => {
            setCancelOpen(false);
            setMode('reschedule');
          }}
          onClose={() => (submitting ? null : setCancelOpen(false))}
        />
      ) : null}
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className={`flex-row items-center justify-between py-3.5 ${last ? '' : 'border-line border-b'}`}
    >
      <Text className="text-muted text-sm">{label}</Text>
      <Text className="text-ink text-sm font-semibold capitalize">{value}</Text>
    </View>
  );
}
