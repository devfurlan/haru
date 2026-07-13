import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { PressScale } from '@/components/press-scale';
import { Text } from '@/components/text';
import { api, type WaitlistOfferView } from '@/lib/api';
import { notifySuccess } from '@/lib/haptics';

// Tela "vaga aberta" (aberta pelo deep link do push: data.offerId + data.entryId). Mostra
// TODOS os horários livres do dia com aquele profissional (regra 3), com um timer calmo cuja
// janela vem da config do estabelecimento (confirmWindowSeconds, regra 4). Se o tempo passar
// ou o cliente sair, ele NÃO perde a posição (regra 5). Copy nunca promete o horário.
const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };
const frauncesSemi = { fontFamily: 'Fraunces_600SemiBold' };

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R; // circunferência ~326.7

type UiState = 'loading' | 'open' | 'confirming' | 'confirmado' | 'taken' | 'expired';

const weekdayOf = (dayLabel: string) => dayLabel.split(',')[0].toLowerCase();

function DarkScreen({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-green-deep flex-1">
      <StatusBar style="light" />
      <View
        pointerEvents="none"
        className="absolute right-0 top-0 h-[220px] w-[260px] rounded-full bg-[rgba(47,211,122,0.12)]"
        style={{ transform: [{ translateX: 60 }, { translateY: -80 }] }}
      />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

// Estado de borda (alguém pegou antes / tempo esgotou): sempre reforça que o cliente
// CONTINUA na fila (regra 5).
function EdgeState({
  icon,
  titlePlain,
  titleAccent,
  message,
  badge,
  primaryLabel,
  onPrimary,
  onLeave,
  leaving,
}: {
  icon: 'bolt' | 'clock';
  titlePlain: string;
  titleAccent: string;
  message: React.ReactNode;
  badge: string;
  primaryLabel: string;
  onPrimary: () => void;
  onLeave: () => void;
  leaving: boolean;
}) {
  return (
    <DarkScreen>
      <View className="flex-1 justify-between px-6 pb-6 pt-4">
        <View className="flex-1 items-center justify-center">
          <View className="h-[84px] w-[84px] items-center justify-center rounded-[28px] border border-[rgba(143,191,164,0.3)] bg-[rgba(255,253,248,0.08)]">
            {icon === 'bolt' ? (
              <Svg width={42} height={42} viewBox="0 0 24 24" fill="none">
                <Path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" stroke="#faf5ea" strokeWidth={2} strokeLinejoin="round" />
              </Svg>
            ) : (
              <Svg width={42} height={42} viewBox="0 0 24 24" fill="none">
                <Circle cx={12} cy={13} r={8} stroke="#faf5ea" strokeWidth={2} />
                <Path d="M12 9v4l2.5 2M9 2h6" stroke="#faf5ea" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
          </View>
          <Text style={fraunces} className="text-cream mt-[22px] text-center text-[32px] leading-[34px] tracking-tight">
            {titlePlain} <Text style={frauncesItalic} className="text-[#8fbfa4]">{titleAccent}</Text>
          </Text>
          <Text className="mt-2.5 max-w-[280px] text-center text-[14.5px] leading-[22px] text-[#8fbfa4]">
            {message}
          </Text>
          <View className="mt-5 flex-row items-center gap-2 rounded-full border border-[rgba(47,211,122,0.3)] bg-[rgba(47,211,122,0.1)] px-[15px] py-[9px]">
            <View className="bg-green-bright h-1.5 w-1.5 rounded-full" />
            <Text className="text-green-bright text-[12.5px] font-bold">{badge}</Text>
          </View>
        </View>
        <View className="gap-2.5">
          <PressScale onPress={onPrimary} className="bg-coral items-center rounded-2xl py-4">
            <Text className="text-[15px] font-bold text-white">{primaryLabel}</Text>
          </PressScale>
          <PressScale
            onPress={onLeave}
            haptic={false}
            disabled={leaving}
            className="items-center rounded-2xl border border-[rgba(250,245,234,0.24)] py-3.5"
          >
            {leaving ? (
              <ActivityIndicator color="#faf5ea" size="small" />
            ) : (
              <Text className="text-cream text-[13.5px] font-bold">Sair da fila</Text>
            )}
          </PressScale>
        </View>
      </View>
    </DarkScreen>
  );
}

export default function AvisoScreen() {
  const { offer: offerId, entry: entryId } = useLocalSearchParams<{ offer?: string; entry?: string }>();
  const [view, setView] = useState<WaitlistOfferView | null>(null);
  const [ui, setUi] = useState<UiState>('loading');
  const [slotIdx, setSlotIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  // "esse horário acabou de ser pego - escolhe outro" (corrida com horários restantes).
  const [raceNotice, setRaceNotice] = useState(false);

  // Aplica a oferta autoritativa do servidor: expirada -> "tempo esgotou"; ativa sem horário
  // -> "alguém pegou"; ativa com horários -> escolher.
  function applyView(v: WaitlistOfferView) {
    setView(v);
    if (v.expired) return setUi('expired');
    if (v.slots.length === 0) return setUi('taken');
    setSlotIdx((i) => (i < v.slots.length ? i : 0));
    setRemainingMs(Math.max(0, new Date(v.holdExpiresAtIso).getTime() - Date.now()));
    setUi('open');
  }

  useEffect(() => {
    if (!offerId || !entryId) return setUi('expired');
    let active = true;
    api
      .waitlistOffer(offerId, entryId)
      .then((v) => active && applyView(v))
      .catch(() => active && setUi('expired'));
    return () => {
      active = false;
    };
  }, [offerId, entryId]);

  // Timer calmo: tica a cada segundo enquanto a vaga está aberta. Ao zerar, vira "tempo
  // esgotou" (o cliente segue na fila). Passo de 1s, anel verde - nada ansioso.
  useEffect(() => {
    if (ui !== 'open' || !view) return;
    const expiresAt = new Date(view.holdExpiresAtIso).getTime();
    const iv = setInterval(() => {
      const left = expiresAt - Date.now();
      if (left <= 0) {
        clearInterval(iv);
        setRemainingMs(0);
        setUi('expired');
      } else {
        setRemainingMs(left);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [ui, view]);

  function goToInterests() {
    router.replace('/fila' as Href);
  }

  function leaveQueue() {
    if (!view) return goToInterests();
    setLeaving(true);
    api
      .leaveWaitlist({ slug: view.slug, professionalId: view.professionalId, dateStr: view.dateStr })
      .catch(() => {})
      .finally(goToInterests);
  }

  async function confirm() {
    if (!view || !offerId || !entryId) return;
    const slot = view.slots[slotIdx];
    setRaceNotice(false);
    setUi('confirming');
    try {
      await api.confirmWaitlistSlot(offerId, { entryId, slotIso: slot.startsAtIso });
      notifySuccess();
      setUi('confirmado');
    } catch {
      // Corrida / timer vencido / horário velho: re-lê a oferta autoritativa e decide.
      const fresh = await api.waitlistOffer(offerId, entryId).catch(() => null);
      if (!fresh || fresh.expired) return setUi('expired');
      if (fresh.slots.length === 0) {
        setView(fresh);
        return setUi('taken');
      }
      // Ainda há horários: só o que escolhi foi pego - volta pra escolher outro.
      setView(fresh);
      setSlotIdx(0);
      setRemainingMs(Math.max(0, new Date(fresh.holdExpiresAtIso).getTime() - Date.now()));
      setRaceNotice(true);
      setUi('open');
    }
  }

  const prof = view?.professionalName ?? null;
  const proSuffix = prof ? ` com ${prof}` : '';
  const chosenLabel = view?.slots[slotIdx]?.label ?? '';

  if (ui === 'loading' || !view) {
    return (
      <DarkScreen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2fd37a" />
        </View>
      </DarkScreen>
    );
  }

  if (ui === 'taken') {
    return (
      <EdgeState
        icon="bolt"
        titlePlain="Alguém foi mais"
        titleAccent="rápido"
        message={
          <>
            Puxa, essa vaga já foi confirmada por outra pessoa. Mas relaxa -{' '}
            <Text className="text-cream font-bold">você continua na fila</Text> de {weekdayOf(view.dayLabel)}
            {proSuffix}.
          </>
        }
        badge="Sua posição na fila foi guardada"
        primaryLabel="Continuar na fila"
        onPrimary={goToInterests}
        onLeave={leaveQueue}
        leaving={leaving}
      />
    );
  }

  if (ui === 'expired') {
    return (
      <EdgeState
        icon="clock"
        titlePlain="Seu tempo"
        titleAccent="acabou"
        message={
          <>
            O tempo pra confirmar passou e a vez foi pra próxima pessoa. Mas{' '}
            <Text className="text-cream font-bold">você segue na fila</Text> - a gente avisa se abrir de
            novo.
          </>
        }
        badge={`Você continua na fila de ${weekdayOf(view.dayLabel)}`}
        primaryLabel="Voltar pra fila"
        onPrimary={goToInterests}
        onLeave={leaveQueue}
        leaving={leaving}
      />
    );
  }

  if (ui === 'confirmado') {
    return (
      <DarkScreen>
        <View className="flex-1 justify-between px-6 pb-6 pt-4">
          <View className="flex-1 items-center justify-center">
            <View className="bg-green-bright h-[84px] w-[84px] items-center justify-center rounded-[28px]">
              <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12l5 5L19 7" stroke="#0a3324" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={fraunces} className="text-cream mt-[22px] text-center text-[36px] leading-[38px] tracking-tight">
              Fechado<Text style={frauncesItalic} className="text-green-bright">!</Text>
            </Text>
            <Text className="mt-2.5 max-w-[280px] text-center text-[14.5px] leading-[22px] text-[#8fbfa4]">
              {view.dayLabel} · {chosenLabel}
              {proSuffix}. A confirmação já está na sua conta.
            </Text>

            <View className="mt-6 w-full rounded-[20px] border border-[rgba(47,211,122,0.28)] bg-[rgba(255,253,248,0.06)] p-4">
              <View className="flex-row items-center justify-between">
                <Text style={frauncesSemi} className="text-cream text-[20px] capitalize">
                  {view.dayLabel} · {chosenLabel}
                </Text>
                {view.priceLabel ? (
                  <Text style={frauncesSemi} className="text-coral text-base">
                    {view.priceLabel}
                  </Text>
                ) : null}
              </View>
              <Text className="mt-1 text-xs font-medium text-[#8fbfa4]">
                {view.serviceName}
                {proSuffix ? ` ·${proSuffix}` : ''} · {view.tenantName}
              </Text>
            </View>
            <View className="mt-3 w-full flex-row items-center gap-2.5 rounded-[14px] border border-[rgba(47,211,122,0.3)] bg-[rgba(47,211,122,0.1)] px-3.5 py-3">
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12l5 5L19 7" stroke="#2fd37a" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text className="flex-1 text-[12px] leading-[17px] text-[#8fdcae]">
                Você saiu da fila de {weekdayOf(view.dayLabel)} automaticamente.
              </Text>
            </View>
          </View>
          <PressScale
            onPress={() => router.replace('/agendamentos' as Href)}
            className="bg-coral items-center rounded-2xl py-4"
          >
            <Text className="text-[15px] font-bold text-white">Ver meus agendamentos</Text>
          </PressScale>
        </View>
      </DarkScreen>
    );
  }

  // ui === 'open' | 'confirming'
  const totalMs = view.confirmWindowSeconds * 1000;
  const remainingMin = Math.max(1, Math.ceil(remainingMs / 60_000));
  const elapsedFrac = Math.min(1, Math.max(0, 1 - remainingMs / totalMs));
  const dashoffset = RING_C * elapsedFrac;
  const windowMin = Math.round(view.confirmWindowSeconds / 60);
  const confirming = ui === 'confirming';

  return (
    <DarkScreen>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-4 pt-2">
        <View className="flex-row items-center gap-2">
          <View className="bg-green-bright h-2 w-2 rounded-full" />
          <Text className="text-green-bright text-[11px] font-bold uppercase tracking-[1.5px]">
            Vaga aberta · {weekdayOf(view.dayLabel)}
          </Text>
        </View>
        <Text style={fraunces} className="text-cream mt-3 text-[30px] leading-[33px] tracking-tight">
          {prof ? `${prof} tem ` : 'Abriu '}
          <Text style={frauncesItalic} className="text-green-bright">
            {view.slots.length} {view.slots.length === 1 ? 'horário' : 'horários'}
          </Text>{' '}
          {view.slots.length === 1 ? 'livre' : 'livres'} {weekdayOf(view.dayLabel)}
        </Text>
        <Text className="mt-2 text-[14px] leading-[21px] text-[#8fbfa4]">Escolhe o seu e confirma num toque.</Text>

        {raceNotice ? (
          <View className="mt-3 flex-row items-center gap-2 rounded-[14px] border border-[rgba(255,90,54,0.4)] bg-[rgba(255,90,54,0.12)] px-3.5 py-2.5">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={12} r={9} stroke="#ff9b83" strokeWidth={2} />
              <Path d="M12 8v5M12 16h.01" stroke="#ff9b83" strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <Text className="flex-1 text-[12.5px] leading-[17px] text-[#ffb7a3]">
              Esse horário acabou de ser pego. Escolhe outro - ainda dá tempo.
            </Text>
          </View>
        ) : null}

        {/* timer calmo (regra 4): anel verde drenando, janela vinda da config */}
        <View className="mt-[18px] flex-row items-center gap-4 rounded-[18px] border border-[rgba(47,211,122,0.24)] bg-[rgba(255,253,248,0.05)] p-4">
          <View className="h-[60px] w-[60px] items-center justify-center">
            <Svg width={60} height={60} viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={60} cy={60} r={RING_R} fill="none" stroke="rgba(143,191,164,0.22)" strokeWidth={9} />
              <Circle
                cx={60}
                cy={60}
                r={RING_R}
                fill="none"
                stroke="#2fd37a"
                strokeWidth={9}
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={dashoffset}
              />
            </Svg>
            <View className="absolute items-center justify-center">
              <Text style={frauncesSemi} className="text-cream text-[17px] leading-none">
                {remainingMin}
              </Text>
              <Text className="text-[8px] font-semibold uppercase tracking-wider text-[#8fbfa4]">min</Text>
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-cream text-[14px] font-semibold">
              Você tem {windowMin} {windowMin === 1 ? 'minuto' : 'minutos'} pra garantir
            </Text>
            <Text className="mt-0.5 text-[12px] leading-[17px] text-[#8fbfa4]">
              Tranquilo - se o tempo passar, você volta pra fila sem perder a vez.
            </Text>
          </View>
        </View>

        <Text className="mt-[18px] text-[12.5px] font-semibold uppercase tracking-wider text-[#8fbfa4]">
          Horários livres{proSuffix}
        </Text>
        <View className="mt-3 gap-2.5">
          {view.slots.map((s, i) => {
            const sel = i === slotIdx;
            return (
              <Pressable
                key={s.startsAtIso}
                onPress={() => setSlotIdx(i)}
                disabled={confirming}
                className={`flex-row items-center justify-between rounded-2xl px-4 py-3.5 ${
                  sel
                    ? 'border-[1.5px] border-green-bright bg-[rgba(47,211,122,0.14)]'
                    : 'border border-[rgba(47,211,122,0.22)] bg-[rgba(255,253,248,0.05)]'
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <Text style={frauncesSemi} className={sel ? 'text-cream text-[20px]' : 'text-[20px] text-[#e7f2ea]'}>
                    {s.label}
                  </Text>
                  <Text className="text-[12px] font-medium text-[#8fbfa4]">
                    {weekdayOf(view.dayLabel)} · {view.serviceName}
                  </Text>
                </View>
                <View
                  className={`h-[26px] w-[26px] items-center justify-center rounded-full ${
                    sel ? 'bg-green-bright' : 'border-2 border-[rgba(143,191,164,0.45)]'
                  }`}
                >
                  {sel ? (
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path d="M5 12l5 5L19 7" stroke="#0a3324" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="px-6 pb-6 pt-2">
        <PressScale onPress={confirm} disabled={confirming} className="bg-coral items-center rounded-2xl py-4">
          {confirming ? (
            <View className="flex-row items-center gap-2.5">
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={frauncesItalic} className="text-[14.5px] text-white">
                Confirmando…
              </Text>
            </View>
          ) : (
            <Text className="text-[15px] font-bold text-white">
              Confirmar {chosenLabel}
              {proSuffix}
            </Text>
          )}
        </PressScale>
        <Text className="mt-2.5 text-center text-[11.5px] text-[#6f9a83]">
          Só confirma o que é seu. Nada é cobrado agora.
        </Text>
      </View>
    </DarkScreen>
  );
}
