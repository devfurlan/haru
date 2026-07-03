import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { type AvailableSlot, formatBRL, formatDuration, maskPhoneBRInput } from '@haru/shared';

import { BookingSuccess } from '@/components/booking-success';
import { CalendarIcon } from '@/components/calendar-icon';
import { HeartIcon } from '@/components/heart-icon';
import { PaymentSection } from '@/components/payment-section';
import { PressScale } from '@/components/press-scale';
import { SlotPicker } from '@/components/slot-picker';
import { Text, TextInput } from '@/components/text';
import {
  api,
  ApiError,
  type PublicService,
  type PublicTenant,
  type RecurrenceFrequency,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFavorites } from '@/lib/use-favorites';

type Step = 'service' | 'select' | 'slot' | 'contact';

// Recorrência (opcional, no passo de contato). 'NONE' = agendamento avulso. Espelha o
// web (StepConfirmar); as constantes de UI ficam inline (a lógica de série é do servidor).
type FrequencyChoice = 'NONE' | RecurrenceFrequency;
const FREQUENCY_ORDER: FrequencyChoice[] = ['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];
const FREQUENCY_LABELS: Record<FrequencyChoice, string> = {
  NONE: 'Uma vez',
  WEEKLY: 'Toda semana',
  BIWEEKLY: 'A cada 15 dias',
  MONTHLY: 'Todo mês',
};
const OCCURRENCE_OPTIONS = [2, 3, 4, 6, 8, 12];

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };

// "45 min · Téo, Ana" / "1h10 · só Téo" - duração + profissionais que fazem o serviço.
function serviceMeta(s: PublicService, tenant: PublicTenant) {
  const names = s.professionalIds
    .map((id) => tenant.professionals.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);
  const pros = names.length === 1 ? `só ${names[0]}` : names.join(', ');
  return `${formatDuration(s.durationMinutes)}${pros ? ` · ${pros}` : ''}`;
}

// Ícone "duas pessoas" do avatar "Qualquer" profissional (design 09).
function PeopleIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3.2} stroke="#2fd37a" strokeWidth={2} />
      <Circle cx={16} cy={8} r={3.2} stroke="#2fd37a" strokeWidth={2} />
      <Path d="M3 19c0-3 2.7-5 6-5M13 19c0-3 2.7-5 6-5" stroke="#2fd37a" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// "Sáb, 15h30 · com Téo" pro rodapé: dia/hora no fuso do tenant + 1º profissional livre
// (o `[0]` é quem o servidor atribui em "qualquer prof.").
function buildSlotSummary(slot: AvailableSlot, tenant: PublicTenant) {
  const wdRaw = new Intl.DateTimeFormat('pt-BR', { timeZone: tenant.timezone, weekday: 'short' })
    .format(new Date(slot.startsAtIso))
    .replace('.', '');
  const wd = wdRaw.charAt(0).toUpperCase() + wdRaw.slice(1);
  const time = slot.label.replace(':', 'h').replace(/h00$/, 'h');
  const proId = slot.professionalIds?.[0];
  const proName = proId ? (tenant.professionals.find((p) => p.id === proId)?.name ?? null) : null;
  return `${wd}, ${time}${proName ? ` · com ${proName}` : ''}`;
}

// "Qui, 02/07 · 09h30" pro card de sucesso (só a data, no fuso do tenant) - o serviço
// já aparece na linha de cima, então passar o summary inteiro duplicaria e estouraria a largura.
function buildConfirmWhen(iso: string, timezone: string) {
  const d = new Date(iso);
  const wdRaw = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, weekday: 'short' })
    .format(d)
    .replace('.', '');
  const wd = wdRaw.charAt(0).toUpperCase() + wdRaw.slice(1);
  const dm = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, day: '2-digit', month: '2-digit' }).format(d);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })
    .format(d)
    .replace(':', 'h')
    .replace(/h00$/, 'h');
  return `${wd}, ${dm} · ${time}`;
}

// Link "adicionar à agenda" via template do Google Agenda (abre app/navegador) - sem
// dependência nativa de calendário. ponytail: cobre iOS e Android; trocar por expo-calendar
// se quiserem o seletor de calendário do SO.
function gcalUrl(title: string, iso: string, minutes: number, location: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(iso);
  const end = new Date(start.getTime() + minutes * 60000);
  const q = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(title)}`,
    `dates=${fmt(start)}/${fmt(end)}`,
    `location=${encodeURIComponent(location)}`,
  ].join('&');
  return `https://calendar.google.com/calendar/render?${q}`;
}

function ShareIcon({ size = 18, color = '#faf5ea' }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 3v13M8 7l4-4 4 4" />
      <Path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </Svg>
  );
}

// Seta "voltar" (chevron) do mockup.
function ChevronLeft({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5l-7 7 7 7"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Barra de progresso dos passos (50% no passo 1, 100% no passo 2).
function ProgressBar({ current }: { current: Step }) {
  const pct = current === 'select' ? '50%' : '100%';
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-[#e6dcc6]">
      <View className="h-full rounded-full bg-green-bright" style={{ width: pct }} />
    </View>
  );
}

export default function BookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useAuth();
  const { ids: favIds, reload: reloadFavs, toggle: toggleFav } = useFavorites();
  const insets = useSafeAreaInsets();

  // Só carrega favoritos quando logado (favoritar exige conta).
  useEffect(() => {
    if (session) reloadFavs();
  }, [session, reloadFavs]);

  const [tenant, setTenant] = useState<PublicTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('service');
  const [service, setService] = useState<PublicService | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null); // null = "Qualquer"
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [slotSummary, setSlotSummary] = useState<string | null>(null); // rodapé "Sáb, 15h30 · com Téo"
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<FrequencyChoice>('NONE');
  const [occurrences, setOccurrences] = useState(4);
  const [booked, setBooked] = useState<
    | { kind: 'single'; appointmentId: string; paymentAvailable: boolean }
    | { kind: 'series'; createdCount: number; skipped: string[]; beyondHorizon: number }
    | null
  >(null);

  useEffect(() => {
    let active = true;
    api
      .tenant(slug)
      .then((t) => active && setTenant(t))
      .catch(
        (err) => active && setLoadError(err instanceof ApiError ? err.message : 'Erro ao carregar'),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  // Pré-preenche contato se o cliente estiver logado (melhor esforço).
  useEffect(() => {
    if (!session) return;
    let active = true;
    api
      .me()
      .then((me) => {
        if (!active) return;
        if (me.name) setName(me.name);
        if (me.phone) setPhone(maskPhoneBRInput(me.phone));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session]);

  const loadSlots = useCallback(
    (dateStr: string) =>
      service
        ? api.tenantSlots(slug, service.id, dateStr, professionalId ?? undefined).then((r) => r.slots)
        : Promise.resolve([]),
    [slug, service, professionalId],
  );

  async function handleConfirm() {
    if (!service || !slotIso) return;
    Keyboard.dismiss(); // some o teclado antes da tela de sucesso subir
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.createBooking(slug, {
        serviceId: service.id,
        professionalId: professionalId ?? undefined,
        slotIso,
        name: name.trim(),
        phone,
        ...(frequency !== 'NONE' ? { frequency, occurrences } : {}),
      });
      if ('series' in result) {
        setBooked({
          kind: 'series',
          createdCount: result.createdCount,
          skipped: result.skipped,
          beyondHorizon: result.beyondHorizon,
        });
      } else {
        setBooked({
          kind: 'single',
          appointmentId: result.appointmentId,
          paymentAvailable: result.paymentAvailable,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível agendar');
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (step === 'contact') setStep('slot');
    else if (step === 'slot') setStep('select');
    else if (step === 'select') setStep('service');
    else router.back();
  }

  // Rodapé do passo "dia+horário": usuário LOGADO com nome+telefone já pula o formulário
  // e agenda direto (design 10); visitante segue pro passo de contato.
  function handleSlotConfirm() {
    if (session && hasContact) handleConfirm();
    else setStep('contact');
  }

  if (loading) {
    return (
      <SafeAreaView className="bg-cream flex-1 items-center justify-center">
        <ActivityIndicator color="#0e7a45" />
      </SafeAreaView>
    );
  }

  if (loadError || !tenant) {
    return (
      <SafeAreaView className="bg-cream flex-1 px-6 pt-10">
        <Text className="text-destructive text-base">{loadError ?? 'Negócio não encontrado'}</Text>
      </SafeAreaView>
    );
  }

  const hasContact = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 10;
  const canConfirm = hasContact && !submitting;

  const canBook = tenant.publicBookingEnabled && tenant.services.length > 0;
  const lowestPrice = tenant.services.length
    ? Math.min(...tenant.services.map((s) => s.priceCents))
    : null;

  // Ações do rodapé da tela de sucesso (adicionar à agenda / compartilhar / CTA),
  // iguais no sucesso avulso e de série - definidas uma vez.
  const successActions = (
    <>
      {slotIso && service ? (
        <View className="flex-row gap-2.5">
          <PressScale
            onPress={() =>
              Linking.openURL(
                gcalUrl(
                  `${service.name} · ${tenant.name}`,
                  slotIso,
                  service.durationMinutes,
                  tenant.name,
                ),
              )
            }
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[rgba(250,245,234,0.24)] py-3.5 active:opacity-70"
          >
            <CalendarIcon size={18} color="#faf5ea" />
            <Text className="text-cream text-[14px] font-bold">Agenda</Text>
          </PressScale>
          <PressScale
            onPress={() =>
              Share.share({
                message: `${service.name} na ${tenant.name}\n${buildConfirmWhen(slotIso, tenant.timezone)}`,
              })
            }
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[rgba(250,245,234,0.24)] py-3.5 active:opacity-70"
          >
            <ShareIcon />
            <Text className="text-cream text-[14px] font-bold">Compartilhar</Text>
          </PressScale>
        </View>
      ) : null}
      <Link href={session ? '/' : '/login'} asChild>
        <Pressable className="bg-coral items-center rounded-2xl py-4 active:scale-[0.98] active:opacity-90">
          <Text className="text-[15px] font-bold text-white">
            {session ? 'Ver meus agendamentos' : 'Entrar na minha conta'}
          </Text>
        </Pressable>
      </Link>
    </>
  );

  return (
    <View className="flex-1">
      <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {step === 'service' ? (
          <>
            {/* Capa do estabelecimento (sem imagem real na API: fundo sólido esmeralda). */}
            <View className="bg-green-deep h-[262px] justify-end px-6 pb-4">
              <View className="absolute left-0 right-0 top-2 flex-row items-center justify-between px-6">
                <Pressable
                  onPress={goBack}
                  hitSlop={8}
                  className="h-10 w-10 items-center justify-center rounded-[13px] bg-[rgba(10,31,24,0.4)] active:opacity-70"
                >
                  <ChevronLeft color="#ffffff" />
                </Pressable>
                {session ? (
                  <Pressable
                    onPress={() =>
                      toggleFav({
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                        logoUrl: tenant.logoUrl,
                      })
                    }
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-[13px] bg-[rgba(10,31,24,0.4)] active:opacity-70"
                  >
                    <HeartIcon filled={favIds.has(tenant.id)} size={20} color="#ff5a36" />
                  </Pressable>
                ) : null}
              </View>
              <Text
                style={fraunces}
                className="text-paper text-[26px]"
                numberOfLines={2}
              >
                {tenant.name}
              </Text>
            </View>

            <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8 pt-5">
              {!canBook ? (
                <View className="border-edge mt-4 items-center rounded-2xl border border-dashed px-6 py-8">
                  <Text className="text-muted text-center text-base leading-6">
                    Este negócio não está aceitando agendamentos online no momento.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={fraunces} className="text-ink mb-3 text-[17px]">
                    Serviços
                  </Text>
                  <View className="gap-2.5">
                    {tenant.services.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          setService(s);
                          setStep('select');
                        }}
                        className="bg-paper border-line flex-row items-center justify-between gap-3 rounded-[15px] border px-[15px] py-[13px] active:opacity-70"
                      >
                        <View className="flex-1">
                          <Text className="text-ink text-[14.5px] font-semibold">{s.name}</Text>
                          <Text className="text-sub mt-0.5 text-xs">
                            {formatDuration(s.durationMinutes)}
                          </Text>
                          {s.description ? (
                            <Text className="text-muted mt-1 text-sm leading-5">
                              {s.description}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={fraunces} className="text-green-deep text-[17px]">
                          {formatBRL(s.priceCents)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Rodapé fixo: menor preço + atalho pra agendar. */}
            {canBook && lowestPrice != null ? (
              <View
                className="bg-cream border-line flex-row items-center gap-3.5 border-t px-6 pt-3.5"
                style={{ paddingBottom: insets.bottom + 12 }}
              >
                <View>
                  <Text className="text-sub text-[11.5px]">a partir de</Text>
                  <Text style={fraunces} className="text-ink text-[22px]">
                    {formatBRL(lowestPrice)}
                  </Text>
                </View>
                <PressScale
                  onPress={() => {
                    setService(tenant.services[0]);
                    setStep('select');
                  }}
                  className="bg-coral flex-1 items-center rounded-2xl py-4 active:opacity-90"
                >
                  <Text className="text-[15px] font-bold text-white">Agendar</Text>
                </PressScale>
              </View>
            ) : null}
          </>
        ) : (
          <>
            {/* Cabeçalho com voltar + nome do negócio + passo. */}
            <View className="flex-row items-center gap-3 px-6 pb-1 pt-2">
              <Pressable
                onPress={goBack}
                hitSlop={8}
                className="bg-paper border-line h-10 w-10 items-center justify-center rounded-[13px] active:opacity-70"
              >
                <ChevronLeft color="#0a3324" />
              </Pressable>
              <View className="flex-1">
                <Text className="text-ink text-sm font-semibold" numberOfLines={1}>
                  {tenant.name}
                </Text>
                <Text className="text-sub text-[11.5px]">
                  {step === 'slot'
                    ? 'Passo 2 de 2 · Dia e horário'
                    : step === 'select'
                      ? 'Passo 1 de 2 · Profissional e serviço'
                      : 'Seus dados'}
                </Text>
              </View>
            </View>

            {step === 'slot' || step === 'select' ? (
              <View className="px-6 pt-3.5">
                <ProgressBar current={step} />
              </View>
            ) : null}

            <ScrollView className="flex-1 px-6" contentContainerClassName="pb-12 pt-4">
              {step === 'select' ? (
                <>
                  {/* Profissional (design 09): "Qualquer" + avatares dos profissionais. */}
                  {tenant.professionals.length > 0 ? (
                    <>
                      <Text className="text-ink text-[13px] font-semibold">Profissional</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerClassName="gap-3 pb-1 pt-[11px]"
                      >
                        <Pressable onPress={() => setProfessionalId(null)} className="items-center">
                          <View
                            className={`bg-green-deep h-[60px] w-[60px] items-center justify-center rounded-[18px] ${
                              professionalId === null ? 'border-[2.5px] border-coral' : ''
                            }`}
                          >
                            <PeopleIcon />
                          </View>
                          <Text className="text-ink mt-1.5 text-xs font-semibold">Qualquer</Text>
                        </Pressable>
                        {tenant.professionals.map((p) => {
                          const sel = professionalId === p.id;
                          return (
                            <Pressable
                              key={p.id}
                              onPress={() => setProfessionalId(p.id)}
                              className="items-center"
                            >
                              <View
                                className={`bg-green-deep h-[60px] w-[60px] items-center justify-center rounded-[18px] ${
                                  sel ? 'border-[2.5px] border-coral' : ''
                                }`}
                              >
                                <Text style={fraunces} className="text-green-bright text-2xl">
                                  {(p.name ?? '?').trim().charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <Text className="text-sub mt-1.5 max-w-[64px] text-xs" numberOfLines={1}>
                                {p.name ?? '—'}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </>
                  ) : null}

                  {/* Serviço (radio): escolhe qual serviço agendar. */}
                  <View className="mt-5 flex-row items-baseline justify-between">
                    <Text className="text-ink text-[13px] font-semibold">Serviço</Text>
                    <Text className="text-sub text-[11.5px]">de todos os profissionais</Text>
                  </View>
                  <View className="mt-[11px] gap-[11px]">
                    {tenant.services.map((s) => {
                      const sel = service?.id === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => {
                            setService(s);
                            // evita beco sem saída: prof. escolhido que não faz o serviço volta pra "Qualquer".
                            if (professionalId && !s.professionalIds.includes(professionalId)) {
                              setProfessionalId(null);
                            }
                          }}
                          style={
                            sel
                              ? {
                                  shadowColor: '#0a3324',
                                  shadowOpacity: 0.5,
                                  shadowRadius: 10,
                                  shadowOffset: { width: 0, height: 6 },
                                  elevation: 2,
                                }
                              : undefined
                          }
                          className={`bg-paper flex-row items-center gap-3 rounded-2xl px-[15px] py-[14px] ${
                            sel ? 'border-[1.5px] border-green-deep' : 'border-edge border'
                          }`}
                        >
                          <View className="flex-1">
                            <Text className="text-ink text-[15px] font-semibold">{s.name}</Text>
                            <Text className="text-sub mt-0.5 text-xs">{serviceMeta(s, tenant)}</Text>
                          </View>
                          <Text style={fraunces} className="text-green-deep mr-1.5 text-[18px]">
                            {formatBRL(s.priceCents)}
                          </Text>
                          {sel ? (
                            <View className="bg-green-deep h-6 w-6 items-center justify-center rounded-full">
                              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                <Path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                              </Svg>
                            </View>
                          ) : (
                            <View className="h-6 w-6 rounded-full border-2 border-[#d6cbb2]" />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : step === 'slot' && service ? (
                <>
                  {/* Resumo do serviço escolhido (toca pra voltar ao passo 1). */}
                  <Pressable
                    onPress={() => setStep('select')}
                    className="bg-paper border-line flex-row items-center gap-3 rounded-[15px] border px-[13px] py-[11px] active:opacity-80"
                  >
                    <View className="bg-green-deep h-10 w-10 items-center justify-center rounded-[12px]">
                      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <Circle cx={9} cy={8} r={3.2} stroke="#2fd37a" strokeWidth={2} />
                        <Circle cx={16} cy={8} r={3.2} stroke="#2fd37a" strokeWidth={2} />
                        <Path
                          d="M3 19c0-3 2.7-5 6-5M13 19c0-3 2.7-5 6-5"
                          stroke="#2fd37a"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </Svg>
                    </View>
                    <View className="flex-1">
                      <Text className="text-ink text-[14.5px] font-semibold" numberOfLines={1}>
                        {service.name}
                      </Text>
                      <Text className="text-sub mt-0.5 text-xs">
                        {formatDuration(service.durationMinutes)} · {formatBRL(service.priceCents)}
                      </Text>
                    </View>
                    <Text className="text-coral text-xs font-bold">Editar</Text>
                  </Pressable>

                  <View className="mt-5">
                    <SlotPicker
                      timezone={tenant.timezone}
                      openWeekdays={tenant.openWeekdays}
                      loadSlots={loadSlots}
                      selectedSlot={slotIso}
                      onSelectSlot={(slot) => {
                        setSlotIso(slot?.startsAtIso ?? null);
                        setSlotSummary(slot ? buildSlotSummary(slot, tenant) : null);
                      }}
                      submitting={submitting}
                    />
                  </View>
                </>
              ) : step === 'contact' ? (
                <View>
                  {/* Recorrência (espelha o web StepConfirmar): repetir o agendamento. */}
                  <Text className="text-ink-soft mb-2.5 text-[12.5px] font-semibold">
                    Repetir agendamento?
                  </Text>
                  <View className="mb-4 flex-row flex-wrap gap-2">
                    {FREQUENCY_ORDER.map((f) => {
                      const sel = frequency === f;
                      return (
                        <Pressable
                          key={f}
                          onPress={() => setFrequency(f)}
                          className={`rounded-full px-3.5 py-2 ${sel ? 'bg-coral' : 'border-edge bg-paper border'}`}
                        >
                          <Text
                            className={`text-[13px] font-semibold ${sel ? 'text-white' : 'text-ink'}`}
                          >
                            {FREQUENCY_LABELS[f]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {frequency !== 'NONE' ? (
                    <>
                      <Text className="text-sub mb-2 text-xs">Quantas vezes no total?</Text>
                      <View className="mb-2 flex-row flex-wrap gap-2">
                        {OCCURRENCE_OPTIONS.map((n) => {
                          const sel = occurrences === n;
                          return (
                            <Pressable
                              key={n}
                              onPress={() => setOccurrences(n)}
                              className={`rounded-full px-4 py-2 ${sel ? 'bg-coral' : 'border-edge bg-paper border'}`}
                            >
                              <Text
                                className={`text-[13px] font-semibold ${sel ? 'text-white' : 'text-ink'}`}
                              >
                                {n}×
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Text className="text-sub mb-4 text-[11.5px]">
                        Pulamos datas sem horário livre (até 90 dias).
                      </Text>
                    </>
                  ) : null}

                  <Text className="text-ink-soft mb-1.5 text-[12.5px] font-semibold">Nome</Text>
                  <TextInput
                    className="border-edge bg-paper text-ink mb-4 rounded-[14px] border px-4 py-[15px] text-base"
                    value={name}
                    onChangeText={setName}
                    placeholder="Seu nome"
                    placeholderTextColor="#9aa8a0"
                  />
                  <Text className="text-ink-soft mb-1.5 text-[12.5px] font-semibold">WhatsApp</Text>
                  <TextInput
                    className="border-edge bg-paper text-ink mb-6 rounded-[14px] border px-4 py-[15px] text-base"
                    value={phone}
                    onChangeText={(t) => setPhone(maskPhoneBRInput(t))}
                    placeholder="(11) 91234-5678"
                    placeholderTextColor="#9aa8a0"
                    keyboardType="phone-pad"
                    inputMode="tel"
                  />
                  {error ? (
                    <Text className="text-destructive mb-4 text-sm">{error}</Text>
                  ) : null}
                  <PressScale
                    disabled={!canConfirm}
                    onPress={handleConfirm}
                    className={`items-center rounded-2xl py-4 ${canConfirm ? 'bg-coral' : 'bg-coral/50'}`}
                  >
                    {submitting ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator color="#ffffff" size="small" />
                        <Text className="text-[15px] font-bold text-white">Confirmando…</Text>
                      </View>
                    ) : (
                      <Text className="text-[15px] font-bold text-white">Confirmar agendamento</Text>
                    )}
                  </PressScale>
                </View>
              ) : null}
            </ScrollView>

            {/* Rodapé do passo 1: resumo serviço+profissional + Continuar (design 09). */}
            {step === 'select' && service ? (
              <View
                className="bg-cream border-line flex-row items-center gap-3.5 border-t px-6 pt-3.5"
                style={{ paddingBottom: insets.bottom + 12 }}
              >
                <View className="flex-1">
                  <Text className="text-sub text-[11.5px]" numberOfLines={1}>
                    {service.name} ·{' '}
                    {professionalId
                      ? (tenant.professionals.find((p) => p.id === professionalId)?.name ??
                        'Profissional')
                      : 'Qualquer prof.'}
                  </Text>
                  <Text style={fraunces} className="text-ink text-[20px]">
                    {formatBRL(service.priceCents)}
                  </Text>
                </View>
                <PressScale
                  onPress={() => setStep('slot')}
                  className="bg-coral items-center rounded-2xl px-8 py-4 active:opacity-90"
                >
                  <Text className="text-[15px] font-bold text-white">Continuar</Text>
                </PressScale>
              </View>
            ) : null}

            {/* Rodapé do passo dia+horário: resumo do horário + confirmar (design 10). */}
            {step === 'slot' && slotIso && service ? (
              <View
                className="bg-cream border-line border-t px-6 pt-3"
                style={{ paddingBottom: insets.bottom + 12 }}
              >
                {/* Logado confirma direto; quem quiser repetir abre as opções (recorrência). */}
                {session && hasContact ? (
                  <Pressable
                    onPress={() => setStep('contact')}
                    hitSlop={6}
                    className="mb-2.5 flex-row items-center justify-center active:opacity-60"
                  >
                    <Text className="text-sub text-xs underline">
                      Repetir toda semana? Ver opções
                    </Text>
                  </Pressable>
                ) : null}
                <View className="flex-row items-center gap-3.5">
                  <View className="flex-1">
                    <Text className="text-sub text-[11.5px]" numberOfLines={1}>
                      {slotSummary}
                    </Text>
                    <Text style={fraunces} className="text-ink text-[20px]">
                      {formatBRL(service.priceCents)}
                    </Text>
                  </View>
                  <PressScale
                    onPress={handleSlotConfirm}
                    disabled={submitting}
                    className="bg-coral items-center rounded-2xl px-8 py-4 active:opacity-90"
                  >
                    {submitting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text className="text-[15px] font-bold text-white">
                        {session && hasContact ? 'Confirmar' : 'Continuar'}
                      </Text>
                    )}
                  </PressScale>
                </View>
              </View>
            ) : null}
          </>
        )}
      </KeyboardAvoidingView>
      </SafeAreaView>

      {booked && booked.kind === 'series' ? (
        <BookingSuccess
          titlePlain="Tudo"
          titleAccent="marcado!"
          message={`Criamos ${booked.createdCount} ${booked.createdCount === 1 ? 'horário recorrente' : 'horários recorrentes'}. Enviamos a confirmação pro seu WhatsApp e e-mail.`}
          tenant={{ name: tenant.name, logoUrl: tenant.logoUrl }}
          line={service?.name ?? null}
          when={slotIso ? buildConfirmWhen(slotIso, tenant.timezone) : null}
          price={service ? formatBRL(service.priceCents) : null}
        >
          {booked.skipped.length > 0 || booked.beyondHorizon > 0 ? (
            <Text className="text-center text-[12px] leading-5 text-[#8fbfa4]">
              {booked.skipped.length > 0
                ? `Pulamos ${booked.skipped.length} ${booked.skipped.length === 1 ? 'data sem horário livre. ' : 'datas sem horário livre. '}`
                : ''}
              {booked.beyondHorizon > 0
                ? `${booked.beyondHorizon} ${booked.beyondHorizon === 1 ? 'data ficou' : 'datas ficaram'} além de 90 dias.`
                : ''}
            </Text>
          ) : null}
          {successActions}
        </BookingSuccess>
      ) : booked ? (
        <BookingSuccess
          titlePlain="Tá"
          titleAccent="marcado!"
          message="Enviamos a confirmação pro seu WhatsApp e e-mail. A gente te lembra antes, relaxa."
          tenant={{ name: tenant.name, logoUrl: tenant.logoUrl }}
          line={service?.name ?? null}
          when={slotIso ? buildConfirmWhen(slotIso, tenant.timezone) : null}
          price={service ? formatBRL(service.priceCents) : null}
        >
          {booked.paymentAvailable ? (
            <PaymentSection slug={slug} appointmentId={booked.appointmentId} />
          ) : null}
          {successActions}
        </BookingSuccess>
      ) : null}
    </View>
  );
}
