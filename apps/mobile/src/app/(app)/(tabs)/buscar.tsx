import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeartIcon } from '@/components/heart-icon';
import { Skeleton } from '@/components/skeleton';
import { Text, TextInput } from '@/components/text';
import { SearchIcon } from '@/components/search-icon';
import { TenantAvatar } from '@/components/tenant-avatar';
import { api, type DiscoverTenant } from '@/lib/api';
import { useFavorites } from '@/lib/use-favorites';

const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesSemi = { fontFamily: 'Fraunces_600SemiBold' };

// Alvo do toggle de favoritar: mesmos campos para resultado e favorito.
type CardTenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  distanceKm?: number | null;
};

// "800 m" / "1,2 km" a partir da distância em km.
function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export default function BuscarScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscoverTenant[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  // Falha de rede/API na busca - pra não mostrar "Nada encontrado" (que sugere que o
  // estabelecimento não existe) quando na verdade a requisição quebrou.
  const [error, setError] = useState(false);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'buscar' | 'favoritos'>(
    params.tab === 'favoritos' ? 'favoritos' : 'buscar',
  );
  // Abrir "Favoritos" a partir do menu pré-seleciona a aba. O param "gruda" na rota,
  // então sincronizamos no foco e limpamos o param - senão, entrar 2x com o mesmo
  // tab=favoritos não muda o valor e a aba não troca (fica onde o usuário deixou).
  useFocusEffect(
    useCallback(() => {
      if (params.tab === 'favoritos') {
        setTab('favoritos');
        router.setParams({ tab: undefined });
      }
    }, [params.tab]),
  );
  // Localização do usuário: 'checking' enquanto pede permissão, 'denied' se negada.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { list, ids, reload, toggle } = useFavorites();

  useFocusEffect(useCallback(() => void reload(), [reload]));

  // Pega a localização uma vez ao montar - o padrão da tela é "perto de você".
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocStatus('denied');
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // sem fix de GPS: segue sem coords (cai na busca por nome)
      }
      setLocStatus('granted');
    })();
  }, []);

  // Busca. Query vazia + localização = lista "perto de você" (imediata). Query >= 2
  // chars = busca por nome (debounce 300ms), ainda ordenada por perto se houver coords.
  useEffect(() => {
    const q = query.trim();
    if (timer.current) clearTimeout(timer.current);

    const run = async () => {
      try {
        const { results } = await api.searchTenants({
          q: q.length >= 2 ? q : undefined,
          lat: coords?.lat,
          lng: coords?.lng,
        });
        setResults(results);
        setError(false);
      } catch {
        setResults([]);
        setError(true);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    };

    if (q.length < 2) {
      // Sem texto: só faz sentido buscar se temos onde ancorar (localização).
      if (!coords) {
        setResults([]);
        setSearched(false);
        setSearching(false);
        setError(false);
        return;
      }
      setSearching(true);
      timer.current = setTimeout(run, 0);
    } else {
      setSearching(true);
      timer.current = setTimeout(run, 300);
    }

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, coords]);

  const nearby = query.trim().length < 2 && !!coords;

  const renderCard = (t: CardTenant) => (
    <Pressable
      key={t.id}
      onPress={() => router.push({ pathname: '/book/[slug]', params: { slug: t.slug } })}
      className="bg-paper border-line mb-3 flex-row gap-3 rounded-[18px] border p-[11px] active:opacity-80"
    >
      <TenantAvatar name={t.name} logoUrl={t.logoUrl} size={74} radius={15} />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text style={frauncesSemi} className="text-ink flex-1 text-base" numberOfLines={1}>
            {t.name}
          </Text>
          <Pressable onPress={() => toggle(t)} hitSlop={10} className="-mr-1 -mt-0.5 p-1">
            <HeartIcon filled={ids.has(t.id)} size={20} />
          </Pressable>
        </View>
        {t.address ? (
          <Text className="text-sub mt-0.5 text-[12.5px]" numberOfLines={2}>
            {t.address}
          </Text>
        ) : null}
        {t.distanceKm != null ? (
          <View className="mt-1 flex-row items-center gap-1">
            <View className="bg-green-bright h-1.5 w-1.5 rounded-full" />
            <Text className="text-green-deep text-[12px] font-semibold">
              {formatDistance(t.distanceKm)} de você
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      {/* Cabeçalho: título + busca + toggle */}
      <View className="px-6 pb-2 pt-6">
        <Text style={fraunces} className="text-ink text-[28px] tracking-tight">
          Descobrir
        </Text>

        <View className="bg-paper border-edge mt-4 flex-row items-center gap-2.5 rounded-2xl border px-4 py-3.5">
          <SearchIcon size={20} color="#0a3324" />
          <TextInput
            className="text-ink flex-1 text-base"
            value={query}
            onChangeText={setQuery}
            placeholder="Barbearia, salão, clínica…"
            placeholderTextColor="#9aa89e"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onFocus={() => setTab('buscar')}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              className="bg-ink/5 h-6 w-6 items-center justify-center rounded-full"
            >
              <Text className="text-muted text-sm leading-none">✕</Text>
            </Pressable>
          )}
        </View>

        {/* Toggle segmentado: Buscar / Favoritos */}
        <View className="mt-4 flex-row gap-2">
          <Pressable
            onPress={() => setTab('buscar')}
            className={`flex-1 items-center rounded-xl py-2.5 ${
              tab === 'buscar' ? 'bg-green-deep' : 'bg-paper border-edge border'
            }`}
          >
            <Text
              className={`text-[13.5px] ${tab === 'buscar' ? 'text-cream font-bold' : 'text-ink font-semibold'}`}
            >
              Perto de mim
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('favoritos')}
            className={`flex-1 items-center rounded-xl py-2.5 ${
              tab === 'favoritos' ? 'bg-green-deep' : 'bg-paper border-edge border'
            }`}
          >
            <Text
              className={`text-[13.5px] ${tab === 'favoritos' ? 'text-cream font-bold' : 'text-ink font-semibold'}`}
            >
              Favoritos
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-12 pt-4"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {tab === 'favoritos' ? (
          list.length > 0 ? (
            list.map((f) =>
              renderCard({
                id: f.tenantId,
                name: f.name,
                slug: f.slug,
                logoUrl: f.logoUrl,
                address: f.address,
              }),
            )
          ) : (
            <View className="mt-16 items-center px-6">
              <View className="bg-coral/10 mb-4 h-20 w-20 items-center justify-center rounded-full">
                <HeartIcon filled size={34} color="#ff5a36" />
              </View>
              <Text style={fraunces} className="text-ink text-center text-xl">
                Sem favoritos ainda
              </Text>
              <Text className="text-muted mt-2 text-center text-base leading-6">
                Toque no coração de um estabelecimento pra salvar aqui.
              </Text>
            </View>
          )
        ) : searching ||
          (nearby && results.length === 0 && !searched) ||
          (locStatus === 'checking' && query.trim().length < 2) ? (
          <View>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                className="bg-paper border-line mb-3 flex-row gap-3 rounded-[18px] border p-[11px]"
              >
                <Skeleton className="h-[74px] w-[74px] rounded-[15px]" />
                <View className="flex-1 justify-center gap-2">
                  <Skeleton className="h-[15px] w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                  <Skeleton className="h-3 w-1/3 rounded-md" />
                </View>
              </View>
            ))}
          </View>
        ) : results.length > 0 ? (
          <>{results.map((t) => renderCard(t))}</>
        ) : locStatus === 'denied' && query.trim().length < 2 ? (
          <View className="mt-16 items-center px-6">
            <View className="bg-coral/10 mb-4 h-20 w-20 items-center justify-center rounded-full">
              <SearchIcon size={34} color="#ff5a36" />
            </View>
            <Text style={fraunces} className="text-ink text-center text-xl">
              Ative a localização
            </Text>
            <Text className="text-muted mt-2 text-center text-base leading-6">
              Libere a localização nas configurações pra ver o que está perto - ou busque
              pelo nome do estabelecimento acima.
            </Text>
          </View>
        ) : error ? (
          <View className="mt-16 items-center px-6">
            <View className="bg-coral/10 mb-4 h-20 w-20 items-center justify-center rounded-full">
              <SearchIcon size={34} color="#ff5a36" />
            </View>
            <Text style={fraunces} className="text-ink text-center text-xl">
              Não deu pra buscar agora
            </Text>
            <Text className="text-muted mt-2 text-center text-base leading-6">
              Verifique sua conexão e tente de novo.
            </Text>
          </View>
        ) : searched ? (
          <View className="mt-16 items-center px-6">
            <View className="bg-coral/10 mb-4 h-20 w-20 items-center justify-center rounded-full">
              <SearchIcon size={34} color="#ff5a36" />
            </View>
            <Text style={fraunces} className="text-ink text-center text-xl">
              Nada encontrado
            </Text>
            <Text className="text-muted mt-2 text-center text-base leading-6">
              Confira o nome ou peça o link do estabelecimento pra ele.
            </Text>
          </View>
        ) : (
          <View className="mt-16 items-center px-6">
            <View className="bg-coral/10 mb-4 h-20 w-20 items-center justify-center rounded-full">
              <SearchIcon size={34} color="#ff5a36" />
            </View>
            <Text style={fraunces} className="text-ink text-center text-xl">
              Busque um estabelecimento
            </Text>
            <Text className="text-muted mt-2 text-center text-base leading-6">
              Digite o nome pra encontrar e agendar em segundos.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
