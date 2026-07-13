import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { BookingSuccess } from '@/components/booking-success';
import { PressScale } from '@/components/press-scale';
import { Text } from '@/components/text';
import { api, ApiError, type CustomerMembershipDetail } from '@/lib/api';

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };

function ChevronLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke="#0a3324" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const STATUS_PILL: Record<string, { label: string; tag: string; bg: string; fg: string }> = {
  ACTIVE: { label: 'Assinatura ativa', tag: 'no ar', bg: '#eaf6ee', fg: '#1b7a4b' },
  PAST_DUE: { label: 'Pagamento pendente', tag: 'em atraso', bg: '#fdece6', fg: '#c2401f' },
  CANCELED: { label: 'Assinatura cancelada', tag: 'encerra no fim do ciclo', bg: '#f2ecdd', fg: '#8a6a25' },
  PENDING: { label: 'Ativando', tag: 'aguardando pagamento', bg: '#f2ecdd', fg: '#8a6a25' },
};

export default function GerenciarScreen() {
  const { membershipId } = useLocalSearchParams<{ membershipId: string }>();
  const insets = useSafeAreaInsets();

  const [detail, setDetail] = useState<CustomerMembershipDetail | null | 'error'>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [canceledDone, setCanceledDone] = useState(false);

  const load = useCallback(() => {
    api
      .membershipDetail(membershipId)
      .then((d) => setDetail(d))
      .catch(() => setDetail('error'));
  }, [membershipId]);
  useFocusEffect(useCallback(() => load(), [load]));

  async function confirmCancel() {
    setCanceling(true);
    try {
      await api.cancelMembership(membershipId);
      setCancelOpen(false);
      setCanceledDone(true);
    } catch (err) {
      setCancelOpen(false);
      // Erro real (rede/permissão): recarrega o estado autoritativo pra não mentir status.
      setDetail(err instanceof ApiError && err.status === 404 ? 'error' : detail);
      load();
    } finally {
      setCanceling(false);
    }
  }

  if (detail === null) {
    return (
      <SafeAreaView className="bg-cream flex-1 items-center justify-center">
        <ActivityIndicator color="#0e7a45" />
      </SafeAreaView>
    );
  }
  if (detail === 'error') {
    return (
      <SafeAreaView className="bg-cream flex-1 px-6 pt-10" edges={['top']}>
        <Text className="text-destructive text-base">Não encontramos essa assinatura.</Text>
        <Pressable onPress={() => router.replace('/clube' as Href)} className="mt-4">
          <Text className="text-green-deep font-bold">Voltar aos meus créditos</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Cancelado agora: tela de confirmação (créditos valem até o fim do ciclo pago).
  if (canceledDone) {
    return (
      <BookingSuccess
        titlePlain="Assinatura"
        titleAccent="cancelada"
        message={`Não cobramos de novo.${detail.creditBalance > 0 ? ` Seus ${detail.creditBalance} créditos valem até ${detail.periodEndLabel ?? 'o fim do ciclo'} - dá tempo de usar.` : ''} Quando quiser voltar, é só assinar de novo.`}
        tenant={{ name: detail.tenantName }}
        icon="x"
        showCard={false}
      >
        <PressScale onPress={() => router.replace('/clube' as Href)} className="bg-coral items-center rounded-2xl py-4">
          <Text className="text-[15px] font-bold text-white">Ver créditos restantes</Text>
        </PressScale>
        <PressScale
          onPress={() => router.replace({ pathname: '/book/[slug]', params: { slug: detail.tenantSlug } } as Href)}
          className="items-center rounded-2xl border border-[rgba(250,245,234,0.24)] py-3.5"
        >
          <Text className="text-cream text-[14px] font-bold">Voltar pra {detail.tenantName}</Text>
        </PressScale>
      </BookingSuccess>
    );
  }

  const pill = STATUS_PILL[detail.status] ?? STATUS_PILL.ACTIVE;

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <View className="flex-row items-center gap-3 px-[22px] pb-1 pt-1">
        <Pressable onPress={() => router.back()} hitSlop={8} className="bg-paper border-line h-10 w-10 items-center justify-center rounded-[13px] active:opacity-70">
          <ChevronLeft />
        </Pressable>
        <View className="flex-1">
          <Text className="text-ink text-sm font-semibold">Sua assinatura</Text>
          <Text className="text-sub text-[11.5px]" numberOfLines={1}>
            {detail.planName} · {detail.tenantName}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-[22px] pb-10 pt-4 gap-3.5">
        {/* Pagamento falhou: estado HONESTO (o gateway retenta sozinho; sem form de cartão no app). */}
        {detail.payFailed ? (
          <View className="rounded-2xl border p-4" style={{ backgroundColor: '#fdece6', borderColor: '#f5c3b5' }}>
            <Text className="text-[14px] font-bold" style={{ color: '#c2401f' }}>
              Cobrança não passou
            </Text>
            <Text className="mt-1 text-[12.5px] leading-5" style={{ color: '#a15a45' }}>
              Não rolou os {detail.priceLabel}{detail.cardLabel ? ` no cartão ${detail.cardLabel}` : ''}. Seus créditos ficam
              pausados até regularizar. Vamos tentar de novo automaticamente nos próximos dias - se o cartão mudou, o
              suporte te ajuda a atualizar.
            </Text>
            <Pressable onPress={() => router.push('/suporte')} className="mt-3 self-start active:opacity-60">
              <Text className="text-[13px] font-bold" style={{ color: '#c2401f' }}>
                Falar com o suporte
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Plano */}
        <View className="bg-paper border-line rounded-[20px] border p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 rounded-full px-2.5 py-1" style={{ backgroundColor: pill.bg }}>
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pill.fg }} />
              <Text className="text-[11.5px] font-bold" style={{ color: pill.fg }}>
                {pill.label}
              </Text>
            </View>
            <Text className="text-sub text-[11px]">{pill.tag}</Text>
          </View>
          <Text style={fraunces} className="text-ink mt-3 text-[20px]">
            {detail.planName}
          </Text>
          <Text className="text-sub mt-0.5 text-[12.5px]">
            {detail.creditsPerCycle} por mês · {detail.creditBalance} disponíveis agora
          </Text>
          <View className="border-line my-3.5 border-t" />
          <View className="flex-row">
            <View className="flex-1">
              <Text className="text-sub text-[11px]">
                {detail.status === 'ACTIVE' ? 'Próxima cobrança' : 'Créditos valem até'}
              </Text>
              <Text className="text-ink mt-0.5 text-[13px] font-semibold">
                {detail.status === 'ACTIVE'
                  ? (detail.nextChargeLabel ?? '—')
                  : (detail.periodEndLabel ?? '—')}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sub text-[11px]">Pagamento</Text>
              <Text className="text-ink mt-0.5 text-[13px] font-semibold">{detail.cardLabel ?? 'Cartão/Pix'}</Text>
            </View>
          </View>
        </View>

        {/* Histórico */}
        {detail.history.length > 0 ? (
          <View>
            <Text className="text-ink mb-2 mt-1 text-[13px] font-semibold">Histórico de pagamentos</Text>
            <View className="bg-paper border-line overflow-hidden rounded-[16px] border">
              {detail.history.map((h, i) => (
                <View
                  key={i}
                  className={`flex-row items-center justify-between px-4 py-3 ${i > 0 ? 'border-line border-t' : ''}`}
                >
                  <Text className="text-ink text-[13px] font-medium">{h.dateLabel}</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-ink text-[13px] font-semibold">{h.amountLabel}</Text>
                    <Text
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                      style={h.paid ? { backgroundColor: '#eaf6ee', color: '#1b7a4b' } : { backgroundColor: '#f2ecdd', color: '#8a6a25' }}
                    >
                      {h.statusLabel}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Cancelar (fácil de achar - dificultar cancelamento queima confiança) */}
        {detail.canCancel ? (
          <Pressable
            onPress={() => setCancelOpen(true)}
            className="border-line bg-paper mt-1 flex-row items-center gap-3 rounded-[16px] border px-4 py-3.5 active:opacity-70"
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#c2401f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12h14M5 12l5-5M5 12l5 5" />
            </Svg>
            <View className="flex-1">
              <Text className="text-ink text-[14px] font-semibold">Cancelar assinatura</Text>
              <Text className="text-sub text-[11.5px]">Sem multa · você escolhe quando</Text>
            </View>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M9 5l7 7-7 7" stroke="#c3b79c" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Sheet de cancelamento */}
      <Modal visible={cancelOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => (canceling ? null : setCancelOpen(false))}>
        <View className="flex-1 justify-end bg-[rgba(4,18,12,0.5)]">
          <Pressable className="flex-1" onPress={() => (canceling ? null : setCancelOpen(false))} />
          <View className="bg-cream rounded-t-[28px] px-6 pt-2.5" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-[18px] mt-1.5 h-[5px] w-11 rounded-full bg-[#dcd2bc]" />
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: '#ffeee9' }}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#ff5a36" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12h14M5 12l5-5M5 12l5 5" />
              </Svg>
            </View>
            <Text style={fraunces} className="text-ink text-[22px]">
              Cancelar o clube?
            </Text>
            <Text className="text-muted mt-1.5 text-[13.5px] leading-5">Sem drama, dá pra voltar quando quiser.</Text>
            <View className="mt-4 gap-3">
              <View className="flex-row items-start gap-2.5">
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#1b7a4b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1 }}>
                  <Path d="M5 12l5 5L19 7" />
                </Svg>
                <Text className="text-muted flex-1 text-[13px] leading-5">
                  Você mantém seus <Text className="text-ink font-semibold">{detail.creditBalance} créditos</Text> até{' '}
                  {detail.periodEndLabel ?? 'o fim do ciclo'} - dá tempo de usar.
                </Text>
              </View>
              <View className="flex-row items-start gap-2.5">
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#1b7a4b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1 }}>
                  <Path d="M5 12l5 5L19 7" />
                </Svg>
                <Text className="text-muted flex-1 text-[13px] leading-5">
                  Depois disso o plano encerra e <Text className="text-ink font-semibold">não cobra mais</Text>. Fim.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={confirmCancel}
              disabled={canceling}
              className="bg-coral mt-5 items-center rounded-[15px] py-4 active:scale-[0.98] active:opacity-90"
            >
              {canceling ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-[15px] font-bold text-white">Sim, cancelar assinatura</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => (canceling ? null : setCancelOpen(false))}
              className="border-green-deep bg-cream mt-[9px] items-center rounded-[15px] border py-[15px] active:scale-[0.98] active:opacity-70"
            >
              <Text className="text-green-deep text-[15px] font-bold">Manter meu clube</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
