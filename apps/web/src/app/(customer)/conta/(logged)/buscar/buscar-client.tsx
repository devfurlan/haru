'use client';

import { Heart, MapPin, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import {
  addFavorite,
  removeFavorite,
  searchTenants,
  type FavoriteItem,
} from '@/app/(customer)/actions';
import { FavoriteHeart } from '@/components/customer/favorite-heart';
import { TenantAvatar } from '@/components/customer/tenant-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { DirectoryTenant } from '@/lib/tenant-directory';

type CardTenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  distanceKm?: number | null;
};

// "800 m" / "1,2 km" a partir da distância em km.
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-16 flex flex-col items-center px-6 text-center">
      <div className="bg-coral/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
        <Search className="text-coral h-[34px] w-[34px]" />
      </div>
      <p className="text-ink font-serif text-xl">{title}</p>
      <p className="text-muted-foreground mt-2 text-base leading-6">{text}</p>
    </div>
  );
}

export function BuscarClient({ initialFavorites }: { initialFavorites: FavoriteItem[] }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'buscar' | 'favoritos'>(
    searchParams.get('tab') === 'favoritos' ? 'favoritos' : 'buscar',
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryTenant[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<'checking' | 'granted' | 'denied'>('checking');

  // Favoritos: estado otimista local (id -> item), semeado do servidor.
  const [favMap, setFavMap] = useState<Map<string, FavoriteItem>>(
    () => new Map(initialFavorites.map((f) => [f.tenantId, f])),
  );
  const [, startFav] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Localização uma vez: o padrão da aba é "perto de você".
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus('granted');
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  // Busca. q vazio + coords = "perto de você" (imediata). q >= 2 = por nome (debounce 300ms).
  useEffect(() => {
    const q = query.trim();
    if (timer.current) clearTimeout(timer.current);

    const run = async () => {
      try {
        const res = await searchTenants({
          q: q.length >= 2 ? q : undefined,
          lat: coords?.lat,
          lng: coords?.lng,
        });
        setResults(res);
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

  const toggleFav = useCallback((t: CardTenant) => {
    setFavMap((prev) => {
      const next = new Map(prev);
      const wasFav = next.has(t.id);
      if (wasFav) next.delete(t.id);
      else
        next.set(t.id, {
          tenantId: t.id,
          name: t.name,
          slug: t.slug,
          logoUrl: t.logoUrl,
          address: t.address,
        });
      startFav(async () => {
        try {
          if (wasFav) await removeFavorite(t.id);
          else await addFavorite(t.id);
        } catch {
          // reverte em caso de falha
          setFavMap((cur) => {
            const rb = new Map(cur);
            if (wasFav)
              rb.set(t.id, {
                tenantId: t.id,
                name: t.name,
                slug: t.slug,
                logoUrl: t.logoUrl,
                address: t.address,
              });
            else rb.delete(t.id);
            return rb;
          });
        }
      });
      return next;
    });
  }, []);

  const nearby = query.trim().length < 2 && !!coords;

  const renderCard = (t: CardTenant) => (
    <Link
      key={t.id}
      href={`/${t.slug}`}
      className="border-line bg-paper mb-3 flex gap-3 rounded-[18px] border p-[11px] transition-transform active:scale-[0.99]"
    >
      <TenantAvatar name={t.name} logoUrl={t.logoUrl} size={74} radius={15} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-ink flex-1 truncate font-serif text-base">{t.name}</p>
          <FavoriteHeart favorited={favMap.has(t.id)} onToggle={() => toggleFav(t)} className="-mr-1 -mt-0.5" />
        </div>
        {t.address ? (
          <p className="text-sub mt-0.5 line-clamp-2 text-[12.5px]">{t.address}</p>
        ) : null}
        {t.distanceKm != null ? (
          <div className="mt-1 flex items-center gap-1">
            <span className="bg-green-bright h-1.5 w-1.5 rounded-full" aria-hidden />
            <span className="text-green-deep text-[12px] font-semibold">
              {formatDistance(t.distanceKm)} de você
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );

  const favList = [...favMap.values()];
  const showSkeleton =
    tab === 'buscar' &&
    (searching ||
      (nearby && results.length === 0 && !searched) ||
      (locStatus === 'checking' && query.trim().length < 2));

  return (
    <div>
      {/* Cabeçalho: título + busca + toggle */}
      <div className="px-5 pb-2 pt-6">
        <h1 className="text-ink font-serif text-[28px] tracking-tight">Descobrir</h1>

        <div className="border-edge bg-paper mt-4 flex items-center gap-2.5 rounded-2xl border px-4 py-3">
          <Search className="text-green-deep h-5 w-5 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setTab('buscar')}
            placeholder="Barbearia, salão, clínica…"
            className="text-ink placeholder:text-[#9aa89e] flex-1 bg-transparent text-base outline-none"
            autoCapitalize="none"
            autoCorrect="off"
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className="bg-ink/5 text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2">
          {(['buscar', 'favoritos'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2.5 text-[13.5px] transition-colors ${
                tab === t
                  ? 'bg-green-deep text-cream font-bold'
                  : 'border-edge bg-paper text-ink border font-semibold'
              }`}
            >
              {t === 'buscar' ? 'Perto de mim' : 'Favoritos'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4 pt-4">
        {tab === 'favoritos' ? (
          favList.length > 0 ? (
            favList.map((f) =>
              renderCard({
                id: f.tenantId,
                name: f.name,
                slug: f.slug,
                logoUrl: f.logoUrl,
                address: f.address,
              }),
            )
          ) : (
            <div className="mt-16 flex flex-col items-center px-6 text-center">
              <div className="bg-coral/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                <Heart className="fill-coral text-coral h-[34px] w-[34px]" />
              </div>
              <p className="text-ink font-serif text-xl">Sem favoritos ainda</p>
              <p className="text-muted-foreground mt-2 text-base leading-6">
                Toque no coração de um estabelecimento pra salvar aqui.
              </p>
            </div>
          )
        ) : showSkeleton ? (
          <div>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="border-line bg-paper mb-3 flex gap-3 rounded-[18px] border p-[11px]"
              >
                <Skeleton className="h-[74px] w-[74px] rounded-[15px]" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-[15px] w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                  <Skeleton className="h-3 w-1/3 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          results.map(renderCard)
        ) : locStatus === 'denied' && query.trim().length < 2 ? (
          <div className="mt-16 flex flex-col items-center px-6 text-center">
            <div className="bg-coral/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
              <MapPin className="text-coral h-[34px] w-[34px]" />
            </div>
            <p className="text-ink font-serif text-xl">Ative a localização</p>
            <p className="text-muted-foreground mt-2 text-base leading-6">
              Libere a localização no navegador pra ver o que está perto - ou busque pelo nome do
              estabelecimento acima.
            </p>
          </div>
        ) : error ? (
          <EmptyState title="Não deu pra buscar agora" text="Verifique sua conexão e tente de novo." />
        ) : searched ? (
          <EmptyState title="Nada encontrado" text="Confira o nome ou peça o link do estabelecimento pra ele." />
        ) : (
          <EmptyState title="Busque um estabelecimento" text="Digite o nome pra encontrar e agendar em segundos." />
        )}
      </div>
    </div>
  );
}
