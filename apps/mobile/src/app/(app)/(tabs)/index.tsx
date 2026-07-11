import { Image } from 'expo-image';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/text';

import { HeartIcon } from '@/components/heart-icon';
import { LoyaltyStrip } from '@/components/loyalty-strip';
import { SearchIcon } from '@/components/search-icon';
import { TenantAvatar } from '@/components/tenant-avatar';
import { api, ApiError, type AppointmentItem, type AppointmentsData, type Me } from '@/lib/api';
import { useBoot } from '@/lib/boot';
import { useFavorites } from '@/lib/use-favorites';
import { useLoyaltyCelebration } from '@/lib/use-loyalty-celebration';

const fraunces = { fontFamily: 'Fraunces_600SemiBold' };
const frauncesItalic = { fontFamily: 'Fraunces_500Medium_Italic' };

// Saudação por hora do dia.
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia,';
  if (h < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

// "15h30" / "Sáb" a partir do ISO no fuso do tenant (mesmo padrão do AppointmentCard).
function whenParts(iso: string, tz: string) {
  const d = new Date(iso);
  const f = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz, ...opts }).format(d).replace('.', '');
  const wd = f({ weekday: 'short' });
  return {
    time: f({ hour: '2-digit', minute: '2-digit' }).replace(':', 'h'),
    weekday: `${wd.charAt(0).toUpperCase()}${wd.slice(1)}`,
  };
}

// "hoje" / "amanhã" / "em N dias" a partir do ISO (sufixo do label, sem dado de API extra).
function relativeDay(iso: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days} dias`;
}

// Ícone de ajuda (header) - abre o suporte.
function HelpIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="#FAF5EA"
        strokeWidth={2}
      />
      <Path
        d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5"
        stroke="#FAF5EA"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 17.5h.01" stroke="#FAF5EA" strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function NextAppointmentCard({ next }: { next: AppointmentItem }) {
  const { time, weekday } = whenParts(next.startsAt, next.tenant.timezone);
  const goDetail = () => router.push(`/appointment/${next.id}`);
  return (
    <View
      className="rounded-[22px] border border-[rgba(47,211,122,0.32)] bg-green-card p-4"
      style={{
        shadowColor: '#04140d',
        shadowOpacity: 0.5,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 18 },
        elevation: 6,
      }}
    >
      <View className="flex-row items-center gap-3">
        <TenantAvatar name={next.tenant.name} logoUrl={next.tenant.logoUrl} size={50} radius={15} />
        <View className="flex-1">
          <Text style={fraunces} className="text-paper text-[17px]" numberOfLines={1}>
            {next.tenant.name}
          </Text>
          <Text className="text-[12.5px] font-medium text-[#8fbfa4]" numberOfLines={1}>
            {next.serviceName}
            {next.professionalName ? ` · com ${next.professionalName}` : ''}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-cream text-[15px] font-bold">{time}</Text>
          <Text className="text-xs text-[#8fbfa4]">{weekday}</Text>
        </View>
      </View>

      <View className="my-4 h-px border-t border-dashed border-[rgba(143,191,164,0.4)]" />

      <View className="flex-row gap-2.5">
        <Pressable
          onPress={goDetail}
          className="bg-coral flex-1 items-center rounded-[13px] py-3 active:opacity-90"
        >
          <Text className="text-sm font-bold text-white">Ver detalhes</Text>
        </Pressable>
        <Pressable
          onPress={goDetail}
          className="flex-1 items-center rounded-[13px] border border-[rgba(250,245,234,0.26)] py-3 active:opacity-70"
        >
          <Text className="text-cream text-sm font-bold">Remarcar</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Aviso na home enquanto a conta não confirmou o WhatsApp por OTP. Leva pra
// /perfil/telefone (prefill do pendingPhone, mesmo comportamento do perfil/dados).
function ConfirmPhoneAlert({ me }: { me: Me }) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/perfil/telefone',
          params: !me.phone && me.pendingPhone ? { prefill: me.pendingPhone } : {},
        })
      }
      className="border-coral/25 bg-coral/10 flex-row items-center gap-3 rounded-[18px] border px-4 py-3.5 active:opacity-80"
    >
      <View className="bg-coral h-9 w-9 items-center justify-center rounded-full">
        <Text className="text-base font-bold text-white">!</Text>
      </View>
      <View className="flex-1">
        <Text className="text-ink text-[14.5px] font-semibold">Confirme seu WhatsApp</Text>
        <Text className="text-sub mt-0.5 text-[12.5px] leading-[17px]">
          Toque para confirmar e receber lembretes dos seus agendamentos.
        </Text>
      </View>
      <Text className="text-coral text-lg">›</Text>
    </Pressable>
  );
}

function EmptyNextCard() {
  return (
    <View className="border-line bg-paper rounded-[22px] border p-5">
      <Text style={fraunces} className="text-ink text-lg">
        Tá tudo <Text style={frauncesItalic} className="text-green-deep">livre</Text>
      </Text>
      <Text className="text-sub mt-1 text-[13px]">Nenhum horário marcado.</Text>
      <Pressable
        onPress={() => router.push('/buscar')}
        className="bg-coral mt-4 items-center rounded-2xl py-3.5 active:opacity-90"
      >
        <Text className="text-[15px] font-bold text-white">Buscar estabelecimento</Text>
      </Pressable>
    </View>
  );
}

function Shortcut({
  onPress,
  iconBg,
  icon,
  title,
  subtitle,
}: {
  onPress: () => void;
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="border-line bg-paper flex-1 rounded-[18px] border p-3.5 active:opacity-80"
    >
      <View className={`h-[38px] w-[38px] items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </View>
      <Text className="text-ink mt-2.5 text-[14.5px] font-semibold">{title}</Text>
      <Text className="text-sub mt-0.5 text-[11.5px]">{subtitle}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [appts, setAppts] = useState<AppointmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { list: favorites, ids, reload: reloadFavs, toggle } = useFavorites();
  const { markContentReady } = useBoot();
  useLoyaltyCelebration();

  const loadCore = useCallback(async () => {
    setError(null);
    try {
      const [meData, apptData] = await Promise.all([api.me(), api.appointments()]);
      setMe(meData);
      setAppts(apptData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // markContentReady solta o splash da boot só depois que a 1ª carga resolveu.
      Promise.all([loadCore(), reloadFavs()]).finally(() => {
        setLoading(false);
        markContentReady();
      });
    }, [loadCore, reloadFavs, markContentReady]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadCore(), reloadFavs()]);
    setRefreshing(false);
  }, [loadCore, reloadFavs]);

  const displayName = me?.name?.trim().split(/\s+/)[0] || me?.email?.split('@')[0] || '';
  const initial = (displayName || 'D').charAt(0).toUpperCase();
  const next = appts?.upcoming[0] ?? null;

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0e7a45" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-12"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0e7a45" />
          }
        >
          {/* HEADER esmeralda */}
          <View className="bg-green-deep pb-6">
            <View className="flex-row items-start justify-between px-6 pt-4">
              <View>
                <Text className="text-sm font-medium text-[#8fbfa4]">{greeting()}</Text>
                <Text style={fraunces} className="text-cream mt-0.5 text-[27px] leading-none">
                  {displayName || 'Bem-vindo'}
                </Text>
              </View>
              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={() => router.push('/suporte')}
                  className="bg-cream/10 h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-[rgba(143,191,164,0.3)] active:opacity-80"
                >
                  <HelpIcon />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/menu')}
                  className="bg-green-bright h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-[14px] active:opacity-80"
                >
                  {me?.avatarUrl ? (
                    <Image
                      source={{ uri: me.avatarUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <Text style={fraunces} className="text-green-deep text-base">
                      {initial}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>

            {/* PRÓXIMO AGENDAMENTO */}
            <View className="px-6 pt-6">
              <View className="mb-3 flex-row items-center gap-2">
                <View className="bg-green-bright h-[7px] w-[7px] rounded-full" />
                <Text className="text-green-bright text-[11px] font-bold uppercase tracking-[0.14em]">
                  Próximo agendamento
                  {next ? ` · ${relativeDay(next.startsAt)}` : ''}
                </Text>
              </View>
              {next ? <NextAppointmentCard next={next} /> : <EmptyNextCard />}
            </View>
          </View>

          {me && !me.phoneVerified ? (
            <View className="px-6 pt-6">
              <ConfirmPhoneAlert me={me} />
            </View>
          ) : null}

          {error ? (
            <View className="items-center px-6 pt-6">
              <Text className="text-destructive text-center text-sm">{error}</Text>
              <Pressable onPress={onRefresh} className="mt-3">
                <Text className="text-coral text-sm font-semibold">Tentar de novo</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Atalhos */}
          <View className="flex-row gap-3 px-6 pt-6">
            <Shortcut
              onPress={() => router.push('/buscar')}
              iconBg="bg-chip"
              icon={<SearchIcon size={21} color="#0A3324" />}
              title="Buscar perto"
              subtitle="barbearias, salões…"
            />
            <Shortcut
              onPress={() => router.push({ pathname: '/buscar', params: { tab: 'favoritos' } })}
              iconBg="bg-[#ffeee9]"
              icon={<HeartIcon filled size={21} />}
              title="Favoritos"
              subtitle={`${favorites.length} ${favorites.length === 1 ? 'lugar' : 'lugares'}`}
            />
          </View>

          {/* Cartão fidelidade (some sozinho se não houver) */}
          <View className="px-6 pt-6">
            <LoyaltyStrip />
          </View>

          {/* Volte pra… */}
          <View className="flex-row items-baseline justify-between px-6 pt-6">
            <Text style={fraunces} className="text-ink text-lg">
              Volte pra…
            </Text>
            {favorites.length > 0 ? (
              <Pressable
                onPress={() => router.push({ pathname: '/buscar', params: { tab: 'favoritos' } })}
                className="active:opacity-70"
              >
                <Text className="text-coral text-[13px] font-semibold">ver tudo</Text>
              </Pressable>
            ) : null}
          </View>

          {favorites.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 px-6 pt-3.5"
            >
              {favorites.map((f) => (
                <Pressable
                  key={f.tenantId}
                  onPress={() => router.push({ pathname: '/book/[slug]', params: { slug: f.slug } })}
                  className="w-[150px] active:opacity-80"
                >
                  <View className="relative">
                    <View className="border-line bg-paper h-[98px] overflow-hidden rounded-[18px] border">
                      <TenantAvatar name={f.name} logoUrl={f.logoUrl} size={98} radius={18} fill />
                    </View>
                    <Pressable
                      onPress={() =>
                        toggle({ id: f.tenantId, name: f.name, slug: f.slug, logoUrl: f.logoUrl })
                      }
                      hitSlop={10}
                      className="bg-paper absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        shadowColor: '#0a3324',
                        shadowOpacity: 0.12,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }}
                    >
                      <HeartIcon filled={ids.has(f.tenantId)} size={16} />
                    </Pressable>
                  </View>
                  <Text className="text-ink mt-2 text-[14.5px] font-semibold" numberOfLines={1}>
                    {f.name}
                  </Text>
                  {f.address ? (
                    <Text className="text-sub mt-0.5 text-xs" numberOfLines={1}>
                      {f.address}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View className="px-6 pt-3.5">
              <Link href={{ pathname: '/buscar', params: { tab: 'favoritos' } }} asChild>
                <Pressable className="border-ink/10 items-center rounded-2xl border border-dashed px-6 py-6 active:opacity-80">
                  <HeartIcon size={26} color="#9aa8a0" />
                  <Text className="text-muted mt-2 text-center text-sm leading-5">
                    Favorite estabelecimentos pra agendar com um toque.
                  </Text>
                </Pressable>
              </Link>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
