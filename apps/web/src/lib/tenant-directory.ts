// Busca do diretório de estabelecimentos - fonte única usada pelo endpoint do app
// (GET /tenants/search) e pela tool buscar_estabelecimentos do bot de suporte, pra que
// os dois casem termo do MESMO jeito (nome + slug, tokenizado, sem acento).
import 'server-only';

import { prisma } from '@haru/database';
import { matchesSearch } from '@haru/shared';

export type DirectoryTenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  // km até o usuário quando a busca envia lat/lng e o estabelecimento tem coords; senão null.
  distanceKm?: number | null;
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// q >= 2 chars filtra por nome/slug; lat/lng ordena por proximidade. Combináveis:
// - só q      -> todos que casam o termo, ordem alfabética.
// - só geo    -> "perto de você" (só quem tem coords), ordenado por distância.
// - q + geo   -> casa o termo; quem tem coords vem antes por distância, o resto por nome.
export async function searchDirectory(opts: {
  q?: string;
  lat?: number;
  lng?: number;
  limit?: number;
}): Promise<DirectoryTenant[]> {
  const q = opts.q?.trim() ?? '';
  const hasName = q.length >= 2;
  const hasGeo = Number.isFinite(opts.lat) && Number.isFinite(opts.lng);
  const limit = opts.limit ?? 20;

  if (!hasName && !hasGeo) return []; // nada pra ancorar a busca

  // ponytail: carrega todos os tenants públicos e filtra/ordena em JS. Diretório é pequeno;
  // trocar por pg_trgm/unaccent + índice GIN (+ haversine em SQL) quando a tabela crescer.
  const rows = await prisma.tenant.findMany({
    where: { publicBookingEnabled: true },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  });

  const matched = hasName ? rows.filter((t) => matchesSearch(q, t.name, t.slug)) : rows;

  const withDist = matched.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    logoUrl: t.logoUrl,
    address: t.address,
    distanceKm:
      hasGeo && t.latitude != null && t.longitude != null
        ? haversineKm(opts.lat!, opts.lng!, t.latitude, t.longitude)
        : null,
  }));

  // Sem termo ("perto de você") só faz sentido listar quem tem distância.
  const finalRows = hasName ? withDist : withDist.filter((t) => t.distanceKm != null);

  finalRows.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1; // com distância antes de sem (NULLS LAST)
    if (b.distanceKm != null) return 1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  return finalRows.slice(0, limit);
}
