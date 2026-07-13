import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { PressScale } from '@/components/press-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Text } from '@/components/text';
import { TenantAvatar } from '@/components/tenant-avatar';
import { api, ApiError, type CustomerWaitlistEntry } from '@/lib/api';

// "Meus interesses": todas as filas em que o cliente está (dias/estabelecimentos
// diferentes - pode estar em várias ao mesmo tempo). Mostra posição e deixa sair.
// Quando uma fila tem vaga aberta, ela vira o destaque no topo com atalho pra escolher.
const frauncesSemi = { fontFamily: 'Fraunces_600SemiBold' };

function BellIcon({ color = '#0a3324', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function QueueCard({
  entry,
  onLeave,
}: {
  entry: CustomerWaitlistEntry;
  onLeave: (e: CustomerWaitlistEntry) => void;
}) {
  const hasOpening = !!entry.offer;
  const withPro = entry.professionalName ? ` · com ${entry.professionalName}` : '';

  return (
    <View
      className={`rounded-[20px] border p-4 ${
        hasOpening ? 'border-green-bright bg-[#0d3a27]' : 'border-line bg-paper'
      }`}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-[46px] w-[46px] overflow-hidden rounded-[14px]">
          <TenantAvatar name={entry.tenantName} logoUrl={entry.logoUrl} fill />
        </View>
        <View className="flex-1">
          <Text
            style={frauncesSemi}
            className={`text-[15.5px] ${hasOpening ? 'text-paper' : 'text-ink'}`}
            numberOfLines={1}
          >
            {entry.tenantName}
          </Text>
          <Text className={`mt-0.5 text-xs ${hasOpening ? 'text-[#8fbfa4]' : 'text-sub'}`} numberOfLines={1}>
            {entry.serviceName}
            {withPro}
          </Text>
        </View>
      </View>

      <View className={`my-3.5 h-px ${hasOpening ? 'bg-[rgba(143,191,164,0.3)]' : 'bg-line'}`} />

      <View className="flex-row items-center justify-between">
        <View>
          <Text className={`text-[11px] font-medium uppercase tracking-wider ${hasOpening ? 'text-[#8fbfa4]' : 'text-sub'}`}>
            Dia na fila
          </Text>
          <Text style={frauncesSemi} className={`mt-0.5 text-[17px] capitalize ${hasOpening ? 'text-cream' : 'text-ink'}`}>
            {entry.dayLabel}
          </Text>
        </View>
        {hasOpening ? (
          <View className="flex-row items-center gap-1.5 rounded-full border border-[rgba(47,211,122,0.4)] bg-[rgba(47,211,122,0.16)] px-3 py-[7px]">
            <View className="bg-green-bright h-1.5 w-1.5 rounded-full" />
            <Text className="text-green-bright text-xs font-bold">Vaga aberta</Text>
          </View>
        ) : (
          <View className="rounded-full bg-[#eef4ef] px-3 py-[7px]">
            <Text className="text-[12px] font-bold text-[#1b7a4b]">Você é o {entry.position}º</Text>
          </View>
        )}
      </View>

      {entry.offer ? (
        <PressScale
          onPress={() =>
            router.push(`/fila/aviso?offer=${entry.offer!.offerId}&entry=${entry.entryId}` as Href)
          }
          className="bg-coral mt-3.5 flex-row items-center justify-center gap-2 rounded-[14px] py-3.5"
        >
          <Text className="text-[14.5px] font-bold text-white">
            {entry.offer.slotsCount > 0
              ? `Ver ${entry.offer.slotsCount} ${entry.offer.slotsCount === 1 ? 'horário livre' : 'horários livres'}`
              : 'Ver a vaga'}
          </Text>
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
            <Path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </PressScale>
      ) : (
        <Pressable onPress={() => onLeave(entry)} hitSlop={6} className="mt-3 self-start py-1 active:opacity-60">
          <Text className="text-sub text-[13px] font-semibold underline">Sair da fila</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function FilaScreen() {
  const [entries, setEntries] = useState<CustomerWaitlistEntry[] | null>(null);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(() => {
    api
      .waitlistEntries()
      .then((r) => setEntries(r.entries))
      .catch(() => setEntries([]));
  }, []);

  // Recarrega ao focar (voltar de confirmar/sair mantém a lista fresca).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmLeave(e: CustomerWaitlistEntry) {
    Alert.alert(
      'Sair da fila?',
      `Você perde a posição na fila de ${e.dayLabel} na ${e.tenantName}. Pode entrar de novo depois.`,
      [
        { text: 'Continuar na fila', style: 'cancel' },
        {
          text: 'Sair da fila',
          style: 'destructive',
          onPress: () => {
            setLeaving(true);
            api
              .leaveWaitlist({ slug: e.tenantSlug, professionalId: e.professionalId, dateStr: e.dateStr })
              .then(() => setEntries((cur) => (cur ? cur.filter((x) => x.entryId !== e.entryId) : cur)))
              .catch((err) =>
                Alert.alert('Ops', err instanceof ApiError ? err.message : 'Não foi possível sair da fila.'),
              )
              .finally(() => setLeaving(false));
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <ScreenHeader title="Meus interesses" eyebrow="Filas de espera" />
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-12 pt-3">
        <Text className="text-sub mb-4 text-[13px] leading-[19px]">
          Dias lotados em que você pediu pra ser avisado. Se abrir vaga, a gente te chama - quem
          confirmar primeiro leva.
        </Text>

        {entries === null ? (
          <View className="gap-3">
            <Skeleton className="h-[150px] rounded-[20px]" />
            <Skeleton className="h-[150px] rounded-[20px]" />
          </View>
        ) : entries.length === 0 ? (
          <View className="border-edge mt-6 items-center rounded-[20px] border border-dashed px-6 py-10">
            <View className="bg-cream-muted h-14 w-14 items-center justify-center rounded-[18px]">
              <BellIcon color="#9aa89e" size={26} />
            </View>
            <Text style={frauncesSemi} className="text-ink mt-3.5 text-center text-[18px]">
              Nenhuma fila por enquanto
            </Text>
            <Text className="text-sub mt-1.5 max-w-[260px] text-center text-[13px] leading-[19px]">
              Quando um dia estiver lotado, toque em {'"me avisa se abrir"'} na hora de escolher o horário.
            </Text>
          </View>
        ) : (
          <View className="gap-3" style={leaving ? { opacity: 0.6 } : undefined}>
            {entries.map((e) => (
              <QueueCard key={e.entryId} entry={e} onLeave={confirmLeave} />
            ))}
          </View>
        )}

        {leaving ? (
          <View className="mt-4 flex-row items-center justify-center gap-2">
            <ActivityIndicator color="#0e7a45" size="small" />
            <Text className="text-sub text-[13px]">Saindo da fila…</Text>
          </View>
        ) : null}

        <View className="mt-6 flex-row items-start gap-2 px-1">
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginTop: 2 }}>
            <Circle cx={12} cy={12} r={9} stroke="#b7ad93" strokeWidth={2} />
            <Path d="M12 8v5M12 16h.01" stroke="#b7ad93" strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <Text className="text-muted flex-1 text-[11.5px] leading-[16px]">
            Entrar na fila não reserva o horário. É só um aviso quando abre vaga.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
