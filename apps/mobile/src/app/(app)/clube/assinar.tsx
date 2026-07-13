import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { formatBRL, maskCpfCnpjInput } from '@haru/shared';

import { BookingSuccess } from '@/components/booking-success';
import { PressScale } from '@/components/press-scale';
import { Text, TextInput } from '@/components/text';
import { api, ApiError, type MembershipPlanPublic, type PublicTenant } from '@/lib/api';

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };

function ChevronLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke="#0a3324" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TicketIcon({ color = '#2fd37a', size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <Path d="M13 5v14" />
    </Svg>
  );
}

// Bullet do "sem pegadinha" (recorrência clara ANTES de cobrar).
function ClearRow({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-start gap-2.5">
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" style={{ marginTop: 1 }}>
        <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" stroke="#2fd37a" strokeWidth={2} />
        <Path d="M12 7v5l3 2" stroke="#2fd37a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text className="flex-1 text-[12.5px] leading-[17px]" style={{ color: '#e6efe9' }}>
        {children}
      </Text>
    </View>
  );
}

type Phase = 'form' | 'pix' | 'done';

export default function AssinarScreen() {
  const { slug, planId } = useLocalSearchParams<{ slug: string; planId: string }>();
  const insets = useSafeAreaInsets();

  const [tenant, setTenant] = useState<PublicTenant | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [hasDoc, setHasDoc] = useState(true); // otimista: só pede CPF se o cadastro não tiver

  const [method, setMethod] = useState<'CREDIT_CARD' | 'PIX'>('CREDIT_CARD');
  const [document, setDocument] = useState('');
  const [needsDoc, setNeedsDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('form');
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .tenant(slug)
      .then((t) => active && setTenant(t))
      .catch((e) => active && setLoadErr(e instanceof ApiError ? e.message : 'Erro ao carregar'));
    api
      .me()
      .then((me) => active && setHasDoc(!!me.document))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug]);

  const plan: MembershipPlanPublic | null = useMemo(
    () => tenant?.membershipPlans.find((p) => p.id === planId) ?? null,
    [tenant, planId],
  );

  // "Corte masculino" / "Corte, Barba +1" - serviços cobertos pelo plano.
  const serviceLabel = useMemo(() => {
    if (!tenant || !plan) return '';
    const names = plan.serviceIds
      .map((id) => tenant.services.find((s) => s.id === id)?.name)
      .filter((n): n is string => !!n);
    if (names.length === 0) return 'Serviços do plano';
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  }, [tenant, plan]);

  // Economia mensal = N créditos × preço avulso do serviço mais barato coberto - mensalidade.
  const savingsCents = useMemo(() => {
    if (!tenant || !plan) return 0;
    const prices = plan.serviceIds
      .map((id) => tenant.services.find((s) => s.id === id)?.priceCents)
      .filter((p): p is number => typeof p === 'number' && p > 0);
    if (!prices.length) return 0;
    return Math.min(...prices) * plan.creditsPerCycle - plan.priceCents;
  }, [tenant, plan]);

  const showDoc = !hasDoc || needsDoc;

  async function subscribe() {
    if (!plan) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.subscribe(slug, {
        planId: plan.id,
        method,
        document: document || undefined,
      });
      if ('error' in result) {
        setError(result.error);
        setNeedsDoc(Boolean(result.needsDocument));
        return;
      }
      setMembershipId(result.membershipId);
      if (method === 'CREDIT_CARD' && result.checkoutUrl) {
        // Cartão vai pro checkout HOSPEDADO do gateway (o app não coleta cartão - PCI/segurança).
        await WebBrowser.openBrowserAsync(result.checkoutUrl);
        setPhase('done');
      } else if (method === 'PIX' && result.pixCopyPaste) {
        setPixCode(result.pixCopyPaste);
        setPhase('pix');
      } else if (result.checkoutUrl) {
        await WebBrowser.openBrowserAsync(result.checkoutUrl);
        setPhase('done');
      } else {
        setError('Não deu pra abrir o pagamento. Tente de novo.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não deu pra iniciar a assinatura agora.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadErr) {
    return (
      <SafeAreaView className="bg-cream flex-1 px-6 pt-10">
        <Text className="text-destructive text-base">{loadErr}</Text>
      </SafeAreaView>
    );
  }
  if (!tenant || !plan) {
    return (
      <SafeAreaView className="bg-cream flex-1 items-center justify-center">
        <ActivityIndicator color="#0e7a45" />
      </SafeAreaView>
    );
  }

  // ── Sucesso: a ativação é webhook-driven, então a tela lê o estado real da assinatura ──
  if (phase === 'done' && membershipId) {
    return <SubscribeDone slug={slug} membershipId={membershipId} plan={plan} tenantName={tenant.name} />;
  }

  const priceLabel = formatBRL(plan.priceCents);

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <View className="flex-row items-center gap-3 px-[22px] pb-1 pt-1">
        <Pressable onPress={() => router.back()} hitSlop={8} className="bg-paper border-line h-10 w-10 items-center justify-center rounded-[13px] active:opacity-70">
          <ChevronLeft />
        </Pressable>
        <View className="flex-1">
          <Text className="text-ink text-sm font-semibold" numberOfLines={1}>
            Assinar o {plan.name}
          </Text>
          <Text className="text-sub text-[11.5px]">{tenant.name} · pagamento recorrente</Text>
        </View>
      </View>

      {phase === 'pix' && pixCode ? (
        <ScrollView className="flex-1" contentContainerClassName="px-[22px] pb-8 pt-4 gap-4">
          <View className="bg-paper border-line rounded-[18px] border p-4">
            <Text style={fraunces} className="text-ink text-base">
              Pague o Pix pra ativar
            </Text>
            <Text className="text-muted mt-1 text-[12.5px] leading-5">
              Copie o código e pague no app do seu banco. Assim que cair, seus {plan.creditsPerCycle}{' '}
              créditos entram e a gente te avisa.
            </Text>
            <Text className="text-sub border-edge bg-cream mt-3 rounded-xl border p-3 text-[11px]" numberOfLines={5} selectable>
              {pixCode}
            </Text>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(pixCode);
                setCopied(true);
              }}
              className="bg-green-deep mt-3 items-center rounded-xl py-3.5 active:opacity-80"
            >
              <Text className="text-[14px] font-bold text-white">{copied ? 'Código copiado!' : 'Copiar código Pix'}</Text>
            </Pressable>
          </View>
          <PressScale onPress={() => setPhase('done')} className="bg-coral items-center rounded-2xl py-4">
            <Text className="text-[15px] font-bold text-white">Já paguei</Text>
          </PressScale>
          <Pressable onPress={() => router.replace('/clube' as Href)} className="items-center py-1 active:opacity-60">
            <Text className="text-green-deep text-[13px] font-bold">Ver meus créditos</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <>
          <ScrollView className="flex-1" contentContainerClassName="px-[22px] pb-6 pt-4">
            {/* resumo do plano */}
            <View className="bg-paper border-line rounded-[18px] border px-4 pb-1 pt-4">
              <View className="flex-row items-center gap-3 pb-3.5">
                <View className="bg-green-deep h-[46px] w-[46px] items-center justify-center rounded-[14px]">
                  <TicketIcon />
                </View>
                <View className="flex-1">
                  <Text style={fraunces} className="text-ink text-base">
                    {plan.name}
                  </Text>
                  <Text className="text-sub mt-0.5 text-[12px]">
                    {plan.creditsPerCycle} por mês · {serviceLabel}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between border-t border-dashed border-[#e6dcc6] py-3">
                <Text className="text-muted text-[13px]">Mensalidade</Text>
                <Text style={fraunces} className="text-ink text-[18px]">
                  {priceLabel}
                  <Text className="text-sub text-[12px]">/mês</Text>
                </Text>
              </View>
              {savingsCents > 0 ? (
                <View className="flex-row items-center justify-between border-t border-dashed border-[#e6dcc6] py-3">
                  <Text className="text-muted text-[13px]">Você economiza</Text>
                  <Text className="rounded-full px-2.5 py-1 text-[13px] font-semibold" style={{ backgroundColor: '#eaf6ee', color: '#1b7a4b' }}>
                    {formatBRL(savingsCents)} / mês
                  </Text>
                </View>
              ) : null}
            </View>

            {/* forma de pagamento */}
            <Text className="text-ink mb-2.5 mt-[18px] text-[13px] font-semibold">Forma de pagamento</Text>
            <View className="flex-row gap-1.5 rounded-[13px] bg-[#f2ecdd] p-1">
              {(['CREDIT_CARD', 'PIX'] as const).map((mth) => {
                const sel = method === mth;
                return (
                  <Pressable
                    key={mth}
                    onPress={() => setMethod(mth)}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] py-2.5 ${sel ? 'bg-green-deep' : ''}`}
                  >
                    <Text className={`text-[13px] font-bold ${sel ? 'text-cream' : 'text-muted'}`}>
                      {mth === 'CREDIT_CARD' ? 'Cartão' : 'Pix recorrente'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-sub mt-2 text-[11.5px] leading-4">
              {method === 'CREDIT_CARD'
                ? 'Você digita o cartão numa página segura do gateway - o app nunca guarda seus dados.'
                : 'Você autoriza uma vez no app do seu banco. A mensalidade sai sozinha todo mês, com aviso antes.'}
            </Text>

            {showDoc ? (
              <View className="mt-3">
                <Text className="text-ink-soft mb-1.5 text-[12.5px] font-semibold">Seu CPF</Text>
                <TextInput
                  className="border-edge bg-paper text-ink rounded-[13px] border px-4 py-3.5 text-base"
                  value={document}
                  onChangeText={(t) => setDocument(maskCpfCnpjInput(t))}
                  placeholder="000.000.000-00"
                  placeholderTextColor="#9aa8a0"
                  keyboardType="number-pad"
                />
                <Text className="text-sub mt-1.5 text-[11px]">O gateway exige o CPF do pagador pra assinatura.</Text>
              </View>
            ) : null}

            {/* recorrência clara - "sem pegadinha" */}
            <View className="bg-green-deep mt-[18px] overflow-hidden rounded-2xl p-4">
              <Text className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: '#2fd37a' }}>
                Sem pegadinha
              </Text>
              <View className="mt-3 gap-2.5">
                <ClearRow>
                  <Text className="text-white">Cobra {priceLabel} agora</Text> e depois todo mês, no {method === 'PIX' ? 'Pix' : 'cartão'}.
                </ClearRow>
                <ClearRow>
                  Seus <Text className="text-white">{plan.creditsPerCycle} créditos</Text> entram assim que o pagamento
                  confirmar - aí é só agendar.
                </ClearRow>
                <ClearRow>
                  <Text className="text-white">Cancela quando quiser</Text>, num toque, sem multa nem ligação.
                </ClearRow>
              </View>
            </View>

            {error ? <Text className="text-destructive mt-4 text-center text-sm">{error}</Text> : null}
          </ScrollView>

          <View className="bg-cream border-line border-t px-[22px] pt-3" style={{ paddingBottom: insets.bottom + 14 }}>
            <PressScale
              onPress={subscribe}
              disabled={submitting}
              className={`items-center rounded-2xl py-4 ${submitting ? 'bg-coral/60' : 'bg-coral'}`}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-base font-bold text-white">Assinar por {priceLabel}/mês</Text>
              )}
            </PressScale>
            <Text className="text-sub mt-2.5 text-center text-[11px] leading-4">
              Renovação automática - cancele quando quiser. Ao assinar, você concorda com os termos do clube.
            </Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// Tela de sucesso da assinatura. A ativação vem por webhook (segundos), então aqui a gente LÊ
// o estado real: se já ativou, celebra; se ainda tá confirmando, é honesto ("a gente te avisa").
function SubscribeDone({
  slug,
  membershipId,
  plan,
  tenantName,
}: {
  slug: string;
  membershipId: string;
  plan: MembershipPlanPublic;
  tenantName: string;
}) {
  const [state, setState] = useState<'checking' | 'active' | 'pending'>('checking');
  const [remaining, setRemaining] = useState(plan.creditsPerCycle);

  async function check() {
    setState('checking');
    try {
      const { memberships } = await api.myMemberships();
      const m = memberships.find((x) => x.membershipId === membershipId);
      if (m && m.status === 'ACTIVE') {
        setRemaining(m.creditBalance);
        setState('active');
      } else {
        setState('pending');
      }
    } catch {
      setState('pending');
    }
  }
  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'checking') {
    return (
      <SafeAreaView className="bg-green-deep flex-1 items-center justify-center">
        <ActivityIndicator color="#2fd37a" />
        <Text className="text-[#8fbfa4] mt-4 text-[13px]">Confirmando seu pagamento…</Text>
      </SafeAreaView>
    );
  }

  if (state === 'active') {
    return (
      <BookingSuccess
        titlePlain="Agora você é"
        titleAccent="do clube!"
        message={`Seus ${remaining} créditos já caíram na conta em ${tenantName}. É só agendar - o crédito desconta sozinho.`}
        tenant={{ name: tenantName }}
        showCard={false}
      >
        <View className="rounded-2xl border p-4" style={{ backgroundColor: 'rgba(255,253,248,0.06)', borderColor: 'rgba(47,211,122,0.3)' }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: '#8fbfa4' }}>
              {plan.name} · {tenantName}
            </Text>
            <Text className="text-[12px] font-semibold" style={{ color: '#2fd37a' }}>
              {remaining} de {plan.creditsPerCycle}
            </Text>
          </View>
          <Text className="mt-2 text-[11px] leading-4" style={{ color: '#6f9a83' }}>
            Cada ticket é um agendamento. Você usa; a gente desconta sozinho.
          </Text>
        </View>
        <PressScale
          onPress={() => router.replace({ pathname: '/book/[slug]', params: { slug } } as Href)}
          className="bg-coral items-center rounded-2xl py-4"
        >
          <Text className="text-[15px] font-bold text-white">Agendar meu primeiro horário</Text>
        </PressScale>
        <PressScale
          onPress={() => router.replace('/clube' as Href)}
          className="items-center rounded-2xl border border-[rgba(250,245,234,0.24)] py-3.5"
        >
          <Text className="text-cream text-[14px] font-bold">Ver meus créditos</Text>
        </PressScale>
      </BookingSuccess>
    );
  }

  // pending: pagamento ainda não confirmado (Pix não pago, ou webhook em trânsito).
  return (
    <BookingSuccess
      titlePlain="Falta"
      titleAccent="pouco!"
      message={`Assim que o pagamento confirmar, seus ${plan.creditsPerCycle} créditos entram em ${tenantName} e a gente te avisa por aqui.`}
      tenant={{ name: tenantName }}
      pending
      showCard={false}
    >
      <PressScale onPress={check} className="bg-coral items-center rounded-2xl py-4">
        <Text className="text-[15px] font-bold text-white">Já paguei, atualizar</Text>
      </PressScale>
      <PressScale
        onPress={() => router.replace('/clube' as Href)}
        className="items-center rounded-2xl border border-[rgba(250,245,234,0.24)] py-3.5"
      >
        <Text className="text-cream text-[14px] font-bold">Ver meus créditos</Text>
      </PressScale>
    </BookingSuccess>
  );
}
