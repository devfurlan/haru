'use client';

import { Heart, MapPin, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  addFavorite,
  removeFavorite,
  searchTenants,
  type FavoriteItem,
} from '@/app/(customer)/actions';
import { FavoriteHeart } from '@/components/customer/favorite-heart';
import { RatingBadge } from '@/components/customer/rating-badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { DirectoryTenant } from '@/lib/tenant-directory';

type CardTenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  coverUrl: string | null;
  segment: string | null;
  openUntilLabel: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  distanceKm?: number | null;
};

const CATEGORIES = ['Todos', 'Barbearia', 'Salão', 'Clínica'] as const;

// sem acento + minúsculo, pra casar "Salão" (chip) com "salao"/"salão" (segment).
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

// "800 m" / "1,2 km" a partir da distância em km.
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function capitalize(s: string | null): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-edge bg-paper mt-2 rounded-[20px] border border-dashed p-11 text-center">
      <p className="text-ink font-serif text-[22px]">{title}</p>
      <p className="text-sub mx-auto mt-2 max-w-md text-[13.5px] leading-6">{text}</p>
    </div>
  );
}

export function BuscarClient({ initialFavorites }: { initialFavorites: FavoriteItem[] }) {
  const searchParams = useSearchParams();
  const [favOnly, setFavOnly] = useState(searchParams.get('tab') === 'favoritos');
  const [cat, setCat] = useState<string>(() => {
    const c = searchParams.get('cat');
    const found = CATEGORIES.find((x) => norm(x) === norm(c ?? ''));
    return found ?? 'Todos';
  });
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

  // Localização uma vez: o padrão é "perto de você".
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
    const item: FavoriteItem = {
      tenantId: t.id,
      name: t.name,
      slug: t.slug,
      logoUrl: t.logoUrl,
      address: t.address,
      coverUrl: t.coverUrl,
      segment: t.segment,
      ratingAvg: t.ratingAvg,
      ratingCount: t.ratingCount,
    };
    setFavMap((prev) => {
      const next = new Map(prev);
      const wasFav = next.has(t.id);
      if (wasFav) next.delete(t.id);
      else next.set(t.id, item);
      startFav(async () => {
        try {
          if (wasFav) await removeFavorite(t.id);
          else await addFavorite(t.id);
        } catch {
          setFavMap((cur) => {
            const rb = new Map(cur);
            if (wasFav) rb.set(t.id, item);
            else rb.delete(t.id);
            return rb;
          });
        }
      });
      return next;
    });
  }, []);

  const nearby = query.trim().length < 2 && !!coords;
  const favList = useMemo(() => [...favMap.values()], [favMap]);

  // Fonte da lista: favoritos ou resultados; depois filtra por categoria (segment).
  const source: CardTenant[] = favOnly
    ? favList.map((f) => ({
        id: f.tenantId,
        name: f.name,
        slug: f.slug,
        logoUrl: f.logoUrl,
        address: f.address,
        coverUrl: f.coverUrl,
        segment: f.segment,
        openUntilLabel: null,
        ratingAvg: f.ratingAvg,
        ratingCount: f.ratingCount,
        distanceKm: null,
      }))
    : results.map((r) => ({ ...r, distanceKm: r.distanceKm ?? null }));

  const cards =
    cat === 'Todos'
      ? source
      : source.filter((t) => t.segment && norm(t.segment).includes(norm(cat)));

  const showSkeleton =
    !favOnly &&
    (searching ||
      (nearby && results.length === 0 && !searched) ||
      (locStatus === 'checking' && query.trim().length < 2));

  const countLabel = favOnly
    ? `${cards.length} ${cards.length === 1 ? 'favorito' : 'favoritos'}`
    : `${cards.length} ${cards.length === 1 ? 'lugar' : 'lugares'} perto de você`;

  const renderCard = (t: CardTenant) => (
    <Link
      key={t.id}
      href={`/${t.slug}`}
      className="border-line bg-paper block overflow-hidden rounded-[20px] border p-[11px] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-24px_rgba(10,51,36,0.42)]"
    >
      <div className="relative">
        {(t.coverUrl ?? t.logoUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.coverUrl ?? t.logoUrl ?? undefined}
            alt={t.name}
            className="h-[150px] w-full rounded-[15px] object-cover"
          />
        ) : (
          <div className="bg-green-deep flex h-[150px] w-full items-center justify-center rounded-[15px]">
            <span className="text-green-bright font-serif text-3xl">
              {t.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <RatingBadge avg={t.ratingAvg} count={t.ratingCount} className="absolute left-2 top-2" />
        <div className="bg-paper/90 absolute right-2 top-2 grid h-[34px] w-[34px] place-items-center rounded-full">
          <FavoriteHeart favorited={favMap.has(t.id)} onToggle={() => toggleFav(t)} size={17} />
        </div>
      </div>
      <div className="px-1.5 pb-1.5 pt-3">
        <p className="text-ink truncate font-serif text-base">{t.name}</p>
        <p className="text-sub mt-0.5 truncate text-[12.5px]">
          {[capitalize(t.segment), t.address].filter(Boolean).join(' · ') || 'Estabelecimento'}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          {t.openUntilLabel ? (
            <span className="bg-chip text-green-deep inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold">
              <span className="bg-green-bright h-1.5 w-1.5 rounded-full" aria-hidden />
              aberto até {t.openUntilLabel}
            </span>
          ) : null}
          {t.distanceKm != null ? (
            <span className="text-sub text-[12px] font-semibold">
              {formatDistance(t.distanceKm)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-7 md:px-8 md:py-9">
      {/* Título + contagem */}
      <div className="flex items-baseline gap-3.5">
        <h1 className="text-ink font-serif text-[28px] tracking-tight md:text-[34px]">Descobrir</h1>
        <span className="text-sub text-[13.5px] font-medium">{countLabel}</span>
      </div>

      {/* Busca + toggle só-favoritos */}
      <div className="mt-5 flex flex-wrap gap-3">
        <div className="border-edge bg-paper flex min-w-[240px] flex-1 items-center gap-2.5 rounded-[15px] border px-4 py-3.5">
          <Search className="h-[19px] w-[19px] shrink-0 text-[#9aa89e]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFavOnly(false)}
            placeholder="Barbearia, salão, clínica…"
            className="text-ink flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-[#9aa89e]"
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
        <button
          type="button"
          onClick={() => setFavOnly((v) => !v)}
          aria-pressed={favOnly}
          className={`flex items-center gap-2 rounded-[15px] border px-5 py-3.5 text-[13.5px] font-bold transition-colors ${
            favOnly ? 'bg-green-deep text-cream border-green-deep' : 'border-edge bg-paper text-ink'
          }`}
        >
          <Heart
            className={`h-4 w-4 ${favOnly ? 'fill-coral text-coral' : 'text-current'}`}
            strokeWidth={2}
          />
          Só favoritos
        </button>
      </div>

      {/* Chips de categoria */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors ${
                active
                  ? 'bg-green-deep text-cream border-green-deep'
                  : 'border-edge bg-paper text-ink hover:bg-cream-2'
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Resultados */}
      <div className="mt-6">
        {showSkeleton ? (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border-line bg-paper rounded-[20px] border p-[11px]">
                <Skeleton className="h-[150px] w-full rounded-[15px]" />
                <div className="space-y-2 px-1.5 py-3">
                  <Skeleton className="h-[15px] w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : cards.length > 0 ? (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(renderCard)}
          </div>
        ) : favOnly ? (
          <EmptyState
            title="Nada por aqui"
            text="Nenhum favorito nessa categoria ainda. Toque no coração de um lugar pra salvar."
          />
        ) : locStatus === 'denied' && query.trim().length < 2 ? (
          <div className="border-edge bg-paper mt-2 rounded-[20px] border border-dashed p-11 text-center">
            <MapPin className="text-coral mx-auto h-8 w-8" aria-hidden />
            <p className="text-ink mt-3 font-serif text-[22px]">Ative a localização</p>
            <p className="text-sub mx-auto mt-2 max-w-md text-[13.5px] leading-6">
              Libere a localização no navegador pra ver o que está perto - ou busque pelo nome do
              estabelecimento acima.
            </p>
          </div>
        ) : error ? (
          <EmptyState
            title="Não deu pra buscar agora"
            text="Verifique sua conexão e tente de novo."
          />
        ) : searched ? (
          <EmptyState
            title="Nada encontrado"
            text="Confira o nome ou peça o link do estabelecimento pra ele."
          />
        ) : (
          <EmptyState
            title="Busque um estabelecimento"
            text="Digite o nome pra encontrar e agendar em segundos."
          />
        )}
      </div>
    </div>
  );
}
