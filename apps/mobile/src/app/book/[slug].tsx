import { Image } from 'expo-image';
import { Link, router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  type AvailableSlot,
  formatBRL,
  formatDuration,
  isoDateInTz,
  maskPhoneBRInput,
  RECURRENCE_MAX_HORIZON_DAYS,
  type SeriesOccurrencePreview,
  type SeriesOccurrenceStatus,
} from '@haru/shared';

import { AddToCalendarSheet } from '@/components/add-to-calendar-sheet';
import { BookingSuccess } from '@/components/booking-success';
import { CalendarIcon } from '@/components/calendar-icon';
import { HeartIcon } from '@/components/heart-icon';
import { PaymentSection } from '@/components/payment-section';
import { PressScale } from '@/components/press-scale';
import { SlotPicker } from '@/components/slot-picker';
import { Text, TextInput } from '@/components/text';
import { WaitlistCta } from '@/components/waitlist-cta';
import { WaitlistJoinSheet } from '@/components/waitlist-join-sheet';
import { WaitlistJoinedOverlay } from '@/components/waitlist-joined-overlay';
import {
  api,
  ApiError,
  type CustomerMembership,
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
  NONE: 'Não',
  WEEKLY: 'Toda semana',
  BIWEEKLY: 'A cada 15 dias',
  MONTHLY: 'Todo mês',
};
const OCCURRENCE_OPTIONS = [2, 3, 4, 6, 8, 12];

// A confirmação de agendamento hoje sai por e-mail + área logada - NÃO por WhatsApp (o plano
// base não dispara confirmação por WhatsApp). Deixar false até A6 (saída transacional pela
// plataforma); quando existir, virar por-tenant (canal ativo) em vez de constante. Ver issue A6.
const WHATSAPP_CONFIRMATION_ACTIVE = false;

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

// "2026-07-15" -> "Sáb, 15/07" no fuso do tenant (rótulo do dia pra fila de espera).
// Meio-dia evita virar o dia por diferença de fuso na hora de formatar.
function dayLabelFromDateStr(dateStr: string, timezone: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  const wdRaw = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, weekday: 'short' })
    .format(d)
    .replace('.', '');
  const wd = wdRaw.charAt(0).toUpperCase() + wdRaw.slice(1);
  const dm = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, day: '2-digit', month: '2-digit' }).format(d);
  return `${wd}, ${dm}`;
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

// Ícone do Clube (ticket/canhoto) - o mesmo em todo o fluxo de assinatura.
function TicketIcon({ color = '#2fd37a', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <Path d="M13 5v14" />
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

const OCC_STATUS_LABEL: Record<SeriesOccurrenceStatus, string> = {
  free: 'livre',
  taken: 'ocupado',
  closed: 'sem expediente',
  past: 'fora do prazo',
  beyond: 'além de 90 dias',
};

// "Sáb, 05/07" e "10h" a partir de um ISO, no fuso do tenant (linhas da prévia).
function fmtOccDate(iso: string, tz: string) {
  const d = new Date(iso);
  const wdRaw = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, weekday: 'short' })
    .format(d)
    .replace('.', '');
  const wd = wdRaw.charAt(0).toUpperCase() + wdRaw.slice(1);
  const dm = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit' }).format(
    d,
  );
  return `${wd}, ${dm}`;
}
function fmtOccTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
    .format(new Date(iso))
    .replace(':', 'h')
    .replace(/h00$/, 'h');
}

// Uma linha da prévia editável: data (mesmo dia/horário do 1º agendamento) + status.
// "Trocar dia/horário" abre um seletor de dia + horário (SlotPicker) semeado no dia da
// ocorrência, buscando horários do MESMO profissional da série - cobre feriado/dia lotado.
// A 1ª (âncora) é fixa.
function SeriesRow({
  occ,
  index,
  timezone,
  slug,
  serviceId,
  professionalId,
  openWeekdays,
  edit,
  swapOpen,
  onToggleSwap,
  onSwap,
  onRemove,
  onRestore,
}: {
  occ: SeriesOccurrencePreview;
  index: number;
  timezone: string;
  slug: string;
  serviceId: string;
  /** Profissional resolvido da série - os horários trocados têm que ser DELE. */
  professionalId: string;
  openWeekdays: number[];
  edit: string | 'removed' | undefined;
  swapOpen: boolean;
  onToggleSwap: () => void;
  onSwap: (pickIso: string) => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const isAnchor = index === 0;
  const removed = edit === 'removed';
  // 'removed' também é string - só é ISO trocado quando NÃO é o marcador de remoção.
  const swappedIso = !removed && typeof edit === 'string' ? edit : null;
  const shownIso = swappedIso ?? occ.targetIso;
  const dropped = occ.status === 'past' || occ.status === 'beyond';
  const conflict =
    !isAnchor && !removed && !swappedIso && (occ.status === 'taken' || occ.status === 'closed');
  const OK = '#0e7a45';
  const WARN = '#b45309';
  const MUTED = '#8a9a90';

  const loadSlots = useCallback(
    // Busca de série (90 dias, profissional fixo) - não a de avulso, que corta em 60.
    (dateStr: string) =>
      api.seriesDaySlots(slug, serviceId, professionalId, dateStr).then((r) => r.slots),
    [slug, serviceId, professionalId],
  );

  return (
    <View
      className={`rounded-2xl border px-3.5 py-3 ${
        conflict
          ? 'border-[#e6b980] bg-[#fbf3e6]'
          : removed || dropped
            ? 'border-edge border-dashed bg-[#efeadd]'
            : 'border-edge bg-paper'
      }`}
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text
            className={`text-[13.5px] font-semibold ${
              removed || dropped ? 'text-sub line-through' : 'text-ink'
            }`}
          >
            {fmtOccDate(shownIso, timezone)}
            <Text className="text-sub font-normal">{`  ·  ${fmtOccTime(shownIso, timezone)}`}</Text>
          </Text>
        </View>
        {isAnchor ? (
          <Text style={{ color: OK }} className="text-[12px] font-semibold">
            ✓ 1º horário
          </Text>
        ) : removed ? (
          <Pressable onPress={onRestore} hitSlop={6}>
            <Text className="text-coral text-[12px] font-bold">Desfazer</Text>
          </Pressable>
        ) : dropped ? (
          <Text style={{ color: MUTED }} className="text-[12px]">
            {OCC_STATUS_LABEL[occ.status]}
          </Text>
        ) : swappedIso ? (
          <Text style={{ color: OK }} className="text-[12px] font-semibold">
            ✓ trocado
          </Text>
        ) : occ.status === 'free' ? (
          <Text style={{ color: OK }} className="text-[12px] font-semibold">
            ✓ livre
          </Text>
        ) : (
          <Text style={{ color: WARN }} className="text-[12px] font-semibold">
            {OCC_STATUS_LABEL[occ.status]}
          </Text>
        )}
      </View>

      {!isAnchor && !removed && !dropped ? (
        <View className="mt-2 flex-row items-center gap-4">
          <Pressable onPress={onToggleSwap} hitSlop={6}>
            <Text className="text-ink text-[12px] font-semibold underline">
              {swapOpen ? 'Fechar' : 'Trocar dia/horário'}
            </Text>
          </Pressable>
          <Pressable onPress={onRemove} hitSlop={6}>
            <Text className="text-sub text-[12px] underline">Remover</Text>
          </Pressable>
        </View>
      ) : null}

      {swapOpen && !removed ? (
        <View className="border-edge mt-3 border-t pt-3">
          <SlotPicker
            timezone={timezone}
            openWeekdays={openWeekdays}
            loadSlots={loadSlots}
            onConfirm={(iso) => onSwap(iso)}
            submitting={false}
            // Semeia (dia + destaque do horário) na escolha ATUAL (trocada, se houver),
            // não na original - senão reabrir "Trocar" volta pro dia/hora antigo.
            initialDay={isoDateInTz(new Date(shownIso), timezone)}
            selectedSlot={shownIso}
            horizonDays={RECURRENCE_MAX_HORIZON_DAYS}
            dayLabel="Trocar dia"
            timeLabel="Horário"
          />
        </View>
      ) : null}
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
  // Prévia editável da recorrência: ocorrências (mesmo dia/horário) + edições do cliente.
  // edits[targetIso]: string = horário escolhido (alvo ou trocado); 'removed' = tirada.
  const [preview, setPreview] = useState<SeriesOccurrencePreview[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string | 'removed'>>({});
  const [swapOpenIso, setSwapOpenIso] = useState<string | null>(null);
  // Profissional resolvido da série (vem da prévia); usado ao trocar o dia de uma ocorrência.
  const [previewProfessionalId, setPreviewProfessionalId] = useState('');
  // Assinaturas do Clube da conta logada (pra cobertura por crédito + bloco de descoberta).
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [booked, setBooked] = useState<
    | {
        kind: 'single';
        appointmentId: string;
        paymentAvailable: boolean;
        status: string;
        coveredBySubscription: boolean;
        membership: { planName: string; remainingCredits: number } | null;
      }
    | { kind: 'series'; createdCount: number; skipped: string[]; beyondHorizon: number }
    | null
  >(null);
  const [calOpen, setCalOpen] = useState(false);
  // Fila de espera: slots do dia selecionado (pra detectar dia lotado) + estados do fluxo.
  const [dayFull, setDayFull] = useState<{ dateStr: string; full: boolean } | null>(null);
  const [joinSheetOpen, setJoinSheetOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState<{
    position: number;
    serviceName: string;
    professionalName: string | null;
    dayLabel: string;
  } | null>(null);

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
        // WhatsApp é opcional: logado sem número (entrou com Google) agenda normalmente - a
        // identidade é a conta e a confirmação sai por e-mail/app. Não redireciona pra lugar
        // nenhum; só pré-preenche o que a conta tiver.
        if (me.name) setName(me.name);
        // Telefone do cadastro vive em pendingPhone até a verificação por OTP; usa ele no
        // fallback pra pré-preencher (se houver).
        const phone = me.phone ?? me.pendingPhone;
        if (phone) setPhone(maskPhoneBRInput(phone));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session, slug]);

  // Assinaturas do Clube (logado): alimenta a cobertura por crédito no agendar + o estado do
  // bloco de descoberta ("Assinar" vs "Você é do clube"). Best-effort; sem clube, fica vazio.
  useEffect(() => {
    if (!session) return;
    let active = true;
    api
      .myMemberships()
      .then((r) => active && setMemberships(r.memberships))
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

  // Dia lotado = dia atendível cujos horários vieram TODOS ocupados (available:false).
  // Se vier 0 horários, é dia sem expediente/passado - sem fila (regra 1). O servidor é a
  // fonte da verdade ao entrar na fila; aqui só decidimos mostrar o CTA.
  const handleDaySlots = useCallback((dateStr: string, slots: AvailableSlot[]) => {
    const full = slots.length > 0 && slots.every((s) => s.available === false);
    setDayFull({ dateStr, full });
  }, []);

  // Sair do passo de horário zera a detecção: ao voltar (novo serviço/dia), o CTA não
  // pisca pro dia antigo enquanto o SlotPicker recarrega.
  useEffect(() => {
    if (step !== 'slot') setDayFull(null);
  }, [step]);

  // Prévia editável da recorrência: recarrega ao mudar frequência/quantidade/slot/profissional.
  useEffect(() => {
    if (frequency === 'NONE' || !slotIso || !service) {
      setPreview(null);
      setEdits({});
      setPreviewError(null);
      return;
    }
    let active = true;
    setPreviewLoading(true);
    setPreviewError(null);
    setSwapOpenIso(null);
    api
      .previewSeries(slug, {
        serviceId: service.id,
        professionalId: professionalId ?? undefined,
        slotIso,
        frequency,
        occurrences,
      })
      .then((res) => {
        if (!active) return;
        setPreview(res.occurrences);
        setPreviewProfessionalId(res.professionalId);
        setEdits({});
      })
      .catch((err) => {
        if (active)
          setPreviewError(
            err instanceof ApiError ? err.message : 'Não foi possível carregar as datas. Tente de novo.',
          );
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [frequency, occurrences, slotIso, professionalId, slug, service]);

  // ISOs finais: âncora sempre entra; livres no alvo; conflitos só se trocados; resto fora.
  const chosenIsos = useMemo(() => {
    if (frequency === 'NONE' || !preview) return [];
    const out: string[] = [];
    preview.forEach((occ, i) => {
      if (i === 0) {
        out.push(occ.targetIso);
        return;
      }
      const e = edits[occ.targetIso];
      if (e === 'removed') return;
      if (typeof e === 'string') out.push(e);
      else if (occ.status === 'free') out.push(occ.targetIso);
    });
    return out;
  }, [frequency, preview, edits]);

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
        ...(frequency !== 'NONE' ? { frequency, slotIsos: chosenIsos } : {}),
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
          status: result.status,
          coveredBySubscription: result.coveredBySubscription,
          membership: result.membership,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível agendar');
    } finally {
      setSubmitting(false);
    }
  }

  // Entra na fila do dia lotado. Exige conta (a identidade é o cliente logado - visitante
  // vai pro login) e um profissional concreto (a fila é por profissional). O servidor
  // valida a elegibilidade e devolve a posição.
  async function handleJoinWaitlist() {
    if (!service || !dayFull || !tenant || !waitlistProId) return;
    setJoining(true);
    setError(null);
    try {
      const res = await api.joinWaitlist(slug, {
        serviceId: service.id,
        professionalId: waitlistProId,
        dateStr: dayFull.dateStr,
        name: name.trim(),
        phone: phone || undefined,
      });
      setJoinSheetOpen(false);
      setJoined({
        position: res.position,
        serviceName: service.name,
        professionalName: waitlistProName,
        dayLabel: dayLabelFromDateStr(dayFull.dateStr, tenant.timezone),
      });
    } catch (err) {
      // Erro real (ex.: fila desligada no servidor): mostra e mantém o sheet.
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar na fila.');
    } finally {
      setJoining(false);
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
    if (session && contactOk) handleConfirm();
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

  const hasName = name.trim().length >= 2;
  // WhatsApp é opcional: logado (session) agenda só com o nome da conta - a confirmação sai
  // por e-mail/app. Sem sessão (sem conta) ainda precisa do número, senão o cliente fica sem
  // canal de contato e o backend recusa.
  const contactOk = hasName && (!!session || phone.replace(/\D/g, '').length >= 10);
  const isSeries = frequency !== 'NONE';
  // Logado não precisa dos campos nome+WhatsApp - a identidade é a conta (número opcional).
  const hideContact = !!session && hasName;
  const seriesReady = !isSeries || (!previewLoading && chosenIsos.length >= 2);
  const canConfirm = contactOk && !submitting && seriesReady;

  const canBook = tenant.publicBookingEnabled && tenant.services.length > 0;
  // Só os profissionais que atendem o serviço escolhido (espelha o web serviceProfs);
  // sem serviço ainda, mostra todos.
  const serviceProfs = service
    ? tenant.professionals.filter((p) => service.professionalIds.includes(p.id))
    : tenant.professionals;
  const lowestPrice = tenant.services.length
    ? Math.min(...tenant.services.map((s) => s.priceCents))
    : null;

  // --- Clube (assinatura) ---
  // Vitrine: 1º plano ativo (o gate Time+ do dono já filtrou no servidor). ponytail: com
  // múltiplos planos o bloco mostra o primeiro; o checkout carrega o plano escolhido.
  const subPlan = tenant.membershipPlans[0] ?? null;
  // Já assina aqui? (dá acesso, ativando ou em atraso) -> bloco vira "ver créditos".
  const subscribedHere = memberships.some(
    (m) => m.tenantSlug === slug && m.status !== 'CANCELED',
  );
  // Cobertura por crédito pro serviço escolhido. O desconto REAL é decidido no servidor no
  // agendar (resolveCoveredMembership); aqui é só o aviso "vai usar crédito" / "acabaram".
  const membershipForService = service
    ? memberships.find((m) => m.tenantSlug === slug && m.coveredServiceIds.includes(service.id))
    : undefined;
  const creditCoverage =
    membershipForService && membershipForService.creditsUsable && membershipForService.creditBalance > 0
      ? membershipForService
      : null;
  const creditsRanOut =
    !!membershipForService && membershipForService.creditsUsable && membershipForService.creditBalance <= 0;

  // Fila de espera é por profissional CONCRETO. "Qualquer" (professionalId null) só resolve
  // quando o serviço tem um único profissional; senão não dá pra oferecer fila (= sem CTA).
  const waitlistProId =
    professionalId ?? (serviceProfs.length === 1 ? serviceProfs[0].id : null);
  const waitlistProName = waitlistProId
    ? (tenant.professionals.find((p) => p.id === waitlistProId)?.name ?? null)
    : null;

  // Ações do rodapé da tela de sucesso (adicionar à agenda / compartilhar / CTA),
  // iguais no sucesso avulso e de série - definidas uma vez.
  const successActions = (
    <>
      {slotIso && service ? (
        <View className="flex-row gap-2.5">
          <PressScale
            onPress={() => setCalOpen(true)}
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
        behavior="padding"
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
                  {/* Bloco do Clube (assinatura) - só aparece se o estabelecimento tem plano ativo. */}
                  {subPlan ? (
                    <Pressable
                      onPress={() =>
                        subscribedHere
                          ? router.push('/clube' as Href)
                          : session
                            ? router.push(`/clube/assinar?slug=${slug}&planId=${subPlan.id}` as Href)
                            : router.push('/login')
                      }
                      className="bg-green-deep relative mb-5 flex-row items-center gap-3 overflow-hidden rounded-2xl px-3.5 py-3 active:opacity-90"
                      style={{ shadowColor: '#04140d', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 4 }}
                    >
                      <View className="h-[42px] w-[42px] items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(47,211,122,0.16)' }}>
                        <TicketIcon />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text style={fraunces} className="text-cream text-[15px]" numberOfLines={1}>
                          {subPlan.name}
                        </Text>
                        <Text className="mt-0.5 text-[11.5px]" style={{ color: '#8fbfa4' }} numberOfLines={1}>
                          {subscribedHere
                            ? 'Você é do clube'
                            : `${subPlan.creditsPerCycle} por mês · ${formatBRL(subPlan.priceCents)}`}
                        </Text>
                      </View>
                      <View className="bg-coral flex-row items-center gap-1.5 rounded-full px-3.5 py-2">
                        <Text className="text-[12.5px] font-bold text-white">{subscribedHere ? 'Ver créditos' : 'Assinar'}</Text>
                        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                          <Path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      </View>
                    </Pressable>
                  ) : null}

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
                  {/* Profissional (design 09): "Qualquer" + avatares dos profissionais.
                      Estabelecimento com um único profissional não mostra a seleção. */}
                  {serviceProfs.length > 1 ? (
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
                        {serviceProfs.map((p) => {
                          const sel = professionalId === p.id;
                          return (
                            <Pressable
                              key={p.id}
                              onPress={() => setProfessionalId(p.id)}
                              className="items-center"
                            >
                              <View
                                className={`bg-green-deep h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-[18px] ${
                                  sel ? 'border-[2.5px] border-coral' : ''
                                }`}
                              >
                                {p.avatarUrl ? (
                                  <Image
                                    source={{ uri: p.avatarUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                    transition={150}
                                  />
                                ) : (
                                  <Text style={fraunces} className="text-green-bright text-2xl">
                                    {(p.name ?? '?').trim().charAt(0).toUpperCase()}
                                  </Text>
                                )}
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
                    {serviceProfs.length > 1 ? (
                      <Text className="text-sub text-[11.5px]">de todos os profissionais</Text>
                    ) : null}
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

                  {/* Cobertura por crédito do Clube: usa crédito (não cobra), ou avisa que acabou. */}
                  {creditCoverage ? (
                    <View className="mt-3 flex-row items-center gap-2.5 rounded-2xl border p-3" style={{ backgroundColor: '#eaf6ee', borderColor: '#c5e6d1' }}>
                      <TicketIcon color="#1b9a5a" size={20} />
                      <View className="flex-1">
                        <Text className="text-[13px] font-semibold" style={{ color: '#1b7a4b' }}>
                          Vai usar 1 crédito - não cobra nada
                        </Text>
                        <Text className="text-sub text-[11.5px]">
                          Coberto pelo {creditCoverage.planName} · {creditCoverage.creditsLabel} este mês
                        </Text>
                      </View>
                    </View>
                  ) : creditsRanOut ? (
                    <View className="mt-3 flex-row items-center gap-2.5 rounded-2xl border p-3" style={{ backgroundColor: '#f4ede0', borderColor: '#e6dcc6' }}>
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#a37a2e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M12 8v5M12 16h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                      </Svg>
                      <Text className="text-sub flex-1 text-[12px] leading-4">
                        Seus créditos do mês acabaram. Esse sai avulso
                        {membershipForService?.renewsLabel ? ` - ou espere ${membershipForService.renewsLabel.toLowerCase()}, quando renova` : ''}.
                      </Text>
                    </View>
                  ) : null}

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
                      onDaySlots={handleDaySlots}
                    />
                  </View>

                  {/* Dia lotado + expediente rolando: entra na fila de espera (regra 1). Só
                      com a fila ligada no estabelecimento e um profissional concreto. */}
                  {tenant.waitlistEnabled && waitlistProId && dayFull?.full && !slotIso ? (
                    <WaitlistCta
                      dayLabel={dayLabelFromDateStr(dayFull.dateStr, tenant.timezone)}
                      professionalName={waitlistProName}
                      submitting={joining}
                      onPress={() => {
                        if (!session) {
                          router.push('/login');
                          return;
                        }
                        setJoinSheetOpen(true);
                      }}
                    />
                  ) : null}
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
                  {isSeries ? (
                    <>
                      <Text className="text-sub mb-2 text-xs">Quantas vezes no total?</Text>
                      <View className="mb-3 flex-row flex-wrap gap-2">
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
                      <Text className="text-sub mb-3 text-[11.5px]">
                        Mantemos o mesmo dia da semana e horário. Onde não há vaga, você troca ou
                        remove.
                      </Text>

                      {/* Prévia editável das datas geradas. */}
                      {previewLoading ? (
                        <View className="mb-4 flex-row items-center gap-2 py-2">
                          <ActivityIndicator color="#0e7a45" size="small" />
                          <Text className="text-sub text-[13px]">Carregando datas…</Text>
                        </View>
                      ) : previewError ? (
                        <Text className="text-destructive mb-4 text-sm">{previewError}</Text>
                      ) : preview && preview.length > 0 ? (
                        <View className="mb-4 gap-2">
                          {preview.map((occ, i) => (
                            <SeriesRow
                              key={occ.targetIso}
                              occ={occ}
                              index={i}
                              timezone={tenant.timezone}
                              slug={slug}
                              serviceId={service?.id ?? ''}
                              professionalId={previewProfessionalId}
                              openWeekdays={tenant.openWeekdays}
                              edit={edits[occ.targetIso]}
                              swapOpen={swapOpenIso === occ.targetIso}
                              onToggleSwap={() =>
                                setSwapOpenIso((cur) =>
                                  cur === occ.targetIso ? null : occ.targetIso,
                                )
                              }
                              onSwap={(pick) => {
                                setEdits((e) => ({ ...e, [occ.targetIso]: pick }));
                                setSwapOpenIso(null);
                              }}
                              onRemove={() =>
                                setEdits((e) => ({ ...e, [occ.targetIso]: 'removed' }))
                              }
                              onRestore={() =>
                                setEdits((e) => {
                                  const copy = { ...e };
                                  delete copy[occ.targetIso];
                                  return copy;
                                })
                              }
                            />
                          ))}
                          <Text className="text-sub mt-1 text-[11.5px]">
                            {chosenIsos.length}{' '}
                            {chosenIsos.length === 1
                              ? 'horário será marcado'
                              : 'horários serão marcados'}
                            .
                            {preview.some((o) => o.status === 'beyond')
                              ? ' Datas além de 90 dias não entram.'
                              : ''}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  ) : null}

                  {hideContact ? null : (
                    <>
                      <Text className="text-ink-soft mb-1.5 text-[12.5px] font-semibold">Nome</Text>
                      <TextInput
                        className="border-edge bg-paper text-ink mb-4 rounded-[14px] border px-4 py-[15px] text-base"
                        value={name}
                        onChangeText={setName}
                        placeholder="Seu nome"
                        placeholderTextColor="#9aa8a0"
                      />
                      <Text className="text-ink-soft mb-1.5 text-[12.5px] font-semibold">
                        WhatsApp
                      </Text>
                      <TextInput
                        className="border-edge bg-paper text-ink mb-1.5 rounded-[14px] border px-4 py-[15px] text-base"
                        value={phone}
                        onChangeText={(t) => setPhone(maskPhoneBRInput(t))}
                        placeholder="(11) 91234-5678"
                        placeholderTextColor="#9aa8a0"
                        keyboardType="phone-pad"
                        inputMode="tel"
                      />
                      <Text className="text-sub mb-6 text-[11.5px]">
                        Pra confirmar pelo WhatsApp. Inclua o DDD.
                      </Text>
                    </>
                  )}
                  {error ? <Text className="text-destructive mb-4 text-sm">{error}</Text> : null}
                  <PressScale
                    disabled={!canConfirm}
                    onPress={handleConfirm}
                    className={`mt-1 items-center rounded-2xl py-4 ${canConfirm ? 'bg-coral' : 'bg-coral/50'}`}
                  >
                    {submitting ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator color="#ffffff" size="small" />
                        <Text className="text-[15px] font-bold text-white">Confirmando…</Text>
                      </View>
                    ) : (
                      <Text className="text-[15px] font-bold text-white">
                        {isSeries
                          ? `Confirmar ${chosenIsos.length} ${chosenIsos.length === 1 ? 'horário' : 'horários'}`
                          : 'Confirmar agendamento'}
                      </Text>
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
                {/* Falha do confirmar-direto (logado) aparece aqui - senão some silenciosa. */}
                {error ? (
                  <Text className="text-destructive mb-2.5 text-center text-sm">{error}</Text>
                ) : null}
                {/* Logado confirma direto; quem quiser repetir abre as opções (recorrência). */}
                {session && contactOk ? (
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
                    {creditCoverage && !isSeries ? (
                      <Text style={[fraunces, { color: '#1b7a4b' }]} className="text-[20px]">
                        Grátis pelo clube
                      </Text>
                    ) : (
                      <Text style={fraunces} className="text-ink text-[20px]">
                        {formatBRL(service.priceCents)}
                      </Text>
                    )}
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
                        {session && contactOk ? (creditCoverage && !isSeries ? 'Usar crédito' : 'Confirmar') : 'Continuar'}
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
          message={`Criamos ${booked.createdCount} ${booked.createdCount === 1 ? 'horário recorrente' : 'horários recorrentes'}. ${
            WHATSAPP_CONFIRMATION_ACTIVE
              ? 'Enviamos a confirmação pro seu WhatsApp e e-mail.'
              : 'Você acompanha tudo na sua conta e a gente te lembra antes de cada horário.'
          }`}
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
          titlePlain={booked.status === 'CONFIRMED' ? 'Tá' : 'Horário'}
          titleAccent={booked.status === 'CONFIRMED' ? 'marcado!' : 'reservado!'}
          message={
            booked.coveredBySubscription
              ? 'É só chegar - nada a pagar, o clube cobre. A confirmação está na sua conta e a gente te lembra antes.'
              : booked.status === 'CONFIRMED'
                ? WHATSAPP_CONFIRMATION_ACTIVE
                  ? 'Enviamos a confirmação pro seu WhatsApp e e-mail. A gente te lembra antes, relaxa.'
                  : 'Enviamos a confirmação pro seu e-mail e ela está na sua conta. A gente te lembra antes, relaxa.'
                : WHATSAPP_CONFIRMATION_ACTIVE
                  ? 'O estabelecimento vai confirmar - você não precisa fazer mais nada. Avisamos pelo WhatsApp e e-mail.'
                  : 'O estabelecimento vai confirmar - você não precisa fazer mais nada. Avisamos por e-mail e na sua conta.'
          }
          pending={booked.status !== 'CONFIRMED'}
          tenant={{ name: tenant.name, logoUrl: tenant.logoUrl }}
          line={service?.name ?? null}
          when={slotIso ? buildConfirmWhen(slotIso, tenant.timezone) : null}
          price={booked.coveredBySubscription ? 'R$ 0' : service ? formatBRL(service.priceCents) : null}
        >
          {booked.coveredBySubscription && booked.membership ? (
            <View className="flex-row items-center gap-2.5 rounded-2xl border p-3" style={{ backgroundColor: 'rgba(47,211,122,0.1)', borderColor: 'rgba(47,211,122,0.3)' }}>
              <TicketIcon color="#2fd37a" size={20} />
              <View className="flex-1">
                <Text className="text-cream text-[13px] font-semibold">Usou 1 crédito</Text>
                <Text className="text-[11.5px]" style={{ color: '#8fbfa4' }}>
                  {booked.membership.remainingCredits === 1
                    ? 'Resta 1 crédito'
                    : `Restam ${booked.membership.remainingCredits} créditos`}{' '}
                  no {booked.membership.planName}
                </Text>
              </View>
            </View>
          ) : booked.paymentAvailable ? (
            <PaymentSection slug={slug} appointmentId={booked.appointmentId} />
          ) : null}
          {successActions}
        </BookingSuccess>
      ) : null}

      {booked && slotIso && service ? (
        <AddToCalendarSheet
          visible={calOpen}
          onClose={() => setCalOpen(false)}
          event={{
            title: `${service.name} · ${tenant.name}`,
            startIso: slotIso,
            minutes: service.durationMinutes,
            location: tenant.name,
          }}
        />
      ) : null}

      {/* Fila de espera: confirmação de entrada (sheet) + tela de sucesso (overlay). */}
      {service && dayFull ? (
        <WaitlistJoinSheet
          visible={joinSheetOpen}
          dayLabel={dayLabelFromDateStr(dayFull.dateStr, tenant.timezone)}
          professionalName={waitlistProName}
          serviceName={service.name}
          priceLabel={formatBRL(service.priceCents)}
          submitting={joining}
          onConfirm={handleJoinWaitlist}
          onClose={() => setJoinSheetOpen(false)}
        />
      ) : null}

      {joined ? (
        <WaitlistJoinedOverlay
          tenantName={tenant.name}
          logoUrl={tenant.logoUrl}
          serviceName={joined.serviceName}
          professionalName={joined.professionalName}
          dayLabel={joined.dayLabel}
          position={joined.position}
          onSeeInterests={() => {
            setJoined(null);
            router.replace('/fila' as Href);
          }}
          onClose={() => setJoined(null)}
        />
      ) : null}
    </View>
  );
}
