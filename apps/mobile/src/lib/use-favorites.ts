// Favoritos do cliente, reusado em Início, Buscar e na tela do estabelecimento.
// Cada tela tem sua própria instância e recarrega no foco/montagem; o toggle é
// otimista e reverte pro estado do servidor se a chamada falhar.
import { useCallback, useState } from 'react';

import { api, type FavoriteTenant } from './api';

type ToggleTarget = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  address?: string | null;
};

export function useFavorites() {
  const [list, setList] = useState<FavoriteTenant[]>([]);
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { favorites } = await api.favorites();
      setList(favorites);
      setIds(new Set(favorites.map((f) => f.tenantId)));
    } catch {
      // silencioso: favoritos são secundários, não travam a tela
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback(
    async (t: ToggleTarget) => {
      const wasFav = ids.has(t.id);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFav) next.delete(t.id);
        else next.add(t.id);
        return next;
      });
      setList((prev) =>
        wasFav
          ? prev.filter((f) => f.tenantId !== t.id)
          : [
              { tenantId: t.id, name: t.name, slug: t.slug, logoUrl: t.logoUrl ?? null, address: t.address ?? null },
              ...prev,
            ],
      );
      try {
        if (wasFav) await api.removeFavorite(t.id);
        else await api.addFavorite(t.id);
      } catch {
        reload();
      }
    },
    [ids, reload],
  );

  return { list, ids, loading, reload, toggle };
}
