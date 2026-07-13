import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { CreditTicketRow } from '@/components/credit-ticket';
import { PressScale } from '@/components/press-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { TenantAvatar } from '@/components/tenant-avatar';
import { Text } from '@/components/text';
import { api, type CustomerMembership } from '@/lib/api';

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };

// Ícone "cofre/vale" pro estado vazio + banner. Fica no espírito do ticket (não do presente).
function TicketGlyph({ color = '#9aa89e', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <Path d="M13 5v14" />
    </Svg>
  );
}

function AlertGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8v5M12 16.5h.01" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" stroke="#fff" strokeWidth={2} />
    </Svg>
  );
}

function RefreshGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" stroke="#0a3324" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Chevron({ color = '#c2401f' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Regra do plano em DESTAQUE (não letra miúda) - acumula (verde) ou vence (âmbar).
function RuleBox({ m }: { m: CustomerMembership }) {
  const acumula = m.rollover;
  return (
    <View
      className="mt-2.5 flex-row items-start gap-2.5 rounded-xl border p-3"
      style={
        acumula
          ? { backgroundColor: '#eaf6ee', borderColor: '#c5e6d1' }
          : { backgroundColor: '#f4ede0', borderColor: '#e6dcc6' }
      }
    >
      {acumula ? (
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#1b9a5a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1 }}>
          <Path d="M4 7l8-4 8 4-8 4-8-4z" />
          <Path d="M4 12l8 4 8-4M4 17l8 4 8-4" />
        </Svg>
      ) : (
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#a37a2e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1 }}>
          <Path d="M12 8v5M12 16h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </Svg>
      )}
      <View className="flex-1">
        <Text className="text-[12.5px] font-semibold" style={{ color: acumula ? '#1b7a4b' : '#8a6a25' }}>
          {m.ruleShort}
        </Text>
        <Text className="text-sub mt-0.5 text-[11.5px] leading-4">{m.ruleLong}</Text>
      </View>
    </View>
  );
}

function MembershipCard({ m }: { m: CustomerMembership }) {
  // "esgotou" só quando os créditos SÃO usáveis mas zeraram; PENDING = ativando, PAST_DUE = pausados.
  const usableEmpty = m.creditsUsable && m.creditBalance <= 0;
  const countColor = m.status === 'PAST_DUE' || usableEmpty ? '#c2401f' : '#0f1f18';
  const countTag =
    m.status === 'PENDING'
      ? 'ativando'
      : m.status === 'PAST_DUE'
        ? 'pausados'
        : usableEmpty
          ? 'esgotou'
          : 'disponíveis';
  // Linha de renovação/estado: ativa mostra a próxima cobrança; cancelada mostra até quando
  // os créditos valem; atraso/ativando explicam por que os créditos estão pausados.
  const statusLine =
    m.status === 'ACTIVE' && m.renewsLabel
      ? `${m.renewsLabel}${m.priceLabel ? ` · cobra ${m.priceLabel}` : ''}${m.cardLabel ? ` no cartão ${m.cardLabel}` : ''}`
      : m.status === 'CANCELED'
        ? `Cancelada · créditos valem até ${m.periodEndLabel ?? 'o fim do ciclo'}`
        : m.status === 'PAST_DUE'
          ? 'Pagamento pendente · créditos pausados até regularizar'
          : 'Ativando · assim que o pagamento confirmar, seus créditos entram';

  return (
    <View
      className="border-line bg-paper rounded-[22px] border p-[17px]"
      style={{ shadowColor: '#0a3324', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 2 }}
    >
      <View className="flex-row items-center gap-3">
        <TenantAvatar name={m.tenantName} logoUrl={m.logoUrl} size={46} radius={14} />
        <View className="min-w-0 flex-1">
          <Text style={fraunces} className="text-ink text-base" numberOfLines={1}>
            {m.tenantName}
          </Text>
          <Text className="text-sub mt-0.5 text-[11.5px]" numberOfLines={1}>
            {m.planName} · {m.serviceLabel}
          </Text>
        </View>
        <View className="items-end">
          <Text style={[fraunces, { color: countColor }]} className="text-[20px] leading-none">
            {m.creditsLabel}
          </Text>
          <Text className="mt-0.5 text-[10.5px]" style={{ color: countColor === '#0f1f18' ? '#7c8a80' : countColor }}>
            {countTag}
          </Text>
        </View>
      </View>

      {/* Tickets só quando os créditos dão acesso (ativa/cancelada-no-prazo); pausados não mostram. */}
      {m.creditsUsable ? (
        <CreditTicketRow balance={m.creditBalance} total={m.creditsPerCycle} notchColor="#fffdf8" />
      ) : null}

      <View className="bg-cream-muted mt-4 flex-row items-center gap-2.5 rounded-xl px-3 py-2.5">
        {m.status === 'ACTIVE' ? <RefreshGlyph /> : <TicketGlyph color="#7c8a80" size={17} />}
        <Text className="text-muted flex-1 text-[12px] leading-4">{statusLine}</Text>
      </View>

      <RuleBox m={m} />

      {m.creditsUsable && m.creditBalance > 0 ? (
        <PressScale
          onPress={() => router.push({ pathname: '/book/[slug]', params: { slug: m.tenantSlug } } as Href)}
          className="bg-coral mt-3.5 items-center rounded-[13px] py-3.5"
        >
          <Text className="text-[14.5px] font-bold text-white">Agendar usando 1 crédito</Text>
        </PressScale>
      ) : null}
      <Pressable onPress={() => router.push(`/clube/${m.membershipId}` as Href)} hitSlop={6} className="mt-3 items-center active:opacity-60">
        <Text className="text-green-deep text-[12.5px] font-bold">Gerenciar assinatura</Text>
      </Pressable>
    </View>
  );
}

export default function ClubeScreen() {
  const [memberships, setMemberships] = useState<CustomerMembership[] | null>(null);

  const load = useCallback(() => {
    api
      .myMemberships()
      .then((r) => setMemberships(r.memberships))
      .catch(() => setMemberships([]));
  }, []);
  useFocusEffect(useCallback(() => load(), [load]));

  const failed = memberships?.find((m) => m.payFailed);

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <ScreenHeader eyebrow="Clube" title="Meus créditos" />
      <ScrollView className="flex-1" contentContainerClassName="gap-3.5 px-6 pb-12 pt-1">
        <Text className="text-sub text-[13px] leading-5">
          Créditos de assinatura - você comprou, é só usar. Some um a cada agendamento, sem pagar de novo.
        </Text>

        {memberships === null ? (
          <View className="gap-3.5">
            <Skeleton className="h-[230px] rounded-[22px]" />
            <Skeleton className="h-[230px] rounded-[22px]" />
          </View>
        ) : memberships.length === 0 ? (
          <View className="border-edge mt-2 items-center rounded-[22px] border border-dashed px-6 py-10">
            <View className="bg-cream-muted mb-3 h-12 w-12 items-center justify-center rounded-2xl">
              <TicketGlyph />
            </View>
            <Text style={fraunces} className="text-ink text-center text-[17px]">
              Você ainda não é do clube
            </Text>
            <Text className="text-sub mt-1.5 text-center text-[13px] leading-5">
              Alguns estabelecimentos têm assinatura: você paga um valor por mês e agenda gastando
              crédito, sem pagar de novo a cada vez. Aparece na página do estabelecimento.
            </Text>
            <PressScale onPress={() => router.push('/buscar')} className="bg-green-deep mt-5 items-center rounded-2xl px-7 py-3.5">
              <Text className="text-[14px] font-bold text-white">Explorar estabelecimentos</Text>
            </PressScale>
          </View>
        ) : (
          <>
            {failed ? (
              <Pressable
                onPress={() => router.push(`/clube/${failed.membershipId}` as Href)}
                className="flex-row items-center gap-3 rounded-2xl border p-3.5 active:opacity-80"
                style={{ backgroundColor: '#ffeee9', borderColor: '#f5c3b5' }}
              >
                <View className="bg-coral h-9 w-9 items-center justify-center rounded-xl">
                  <AlertGlyph />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold" style={{ color: '#c2401f' }}>
                    Cobrança do clube não passou
                  </Text>
                  <Text className="text-[11.5px]" style={{ color: '#a15a45' }}>
                    Seus créditos estão pausados. Toque pra ver o que fazer.
                  </Text>
                </View>
                <Chevron />
              </Pressable>
            ) : null}

            {memberships.map((m) => (
              <MembershipCard key={m.membershipId} m={m} />
            ))}

            <Text className="text-sub mt-1 px-3 text-center text-[12px] leading-5">
              Você pode assinar o clube de vários lugares - cada um com sua própria regra.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
