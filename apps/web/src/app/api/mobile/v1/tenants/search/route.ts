// GET /api/mobile/v1/tenants/search - diretório de estabelecimentos do app. Exige
// Bearer (só clientes logados) pra não virar scraping aberto, e só lista quem aceita
// agendamento público (publicBookingEnabled).
//
// Params:
//   lat,lng - ordena por proximidade (haversine) os tenants que têm coordenadas.
//   q       - filtra por nome (>= 2 chars). Combina com lat/lng (nome + ordenado por perto).
// Sem lat/lng cai na busca por nome pura (ordem alfabética), como antes.
import { Prisma, prisma } from '@haru/database';

import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

type Row = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  distanceKm: number;
};

export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const q = sp.get('q')?.trim() ?? '';
  const lat = Number(sp.get('lat'));
  const lng = Number(sp.get('lng'));
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

  if (hasGeo) {
    // ponytail: haversine + ORDER BY varre a tabela de tenants (sem índice espacial).
    // Suficiente pro diretório atual; trocar por PostGIS/earthdistance + bounding box
    // se crescer a ponto de a varredura pesar. `least/greatest` clampa o arg do acos
    // (erro de ponto flutuante pode estourar [-1,1] e virar NaN).
    const nameFilter = q.length >= 2 ? Prisma.sql`AND "name" ILIKE ${`%${q}%`}` : Prisma.empty;
    const results = await prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT "id", "name", "slug", "logoUrl", "address",
        6371 * acos(least(1, greatest(-1,
          cos(radians(${lat})) * cos(radians("latitude")) *
            cos(radians("longitude") - radians(${lng}))
          + sin(radians(${lat})) * sin(radians("latitude"))
        ))) AS "distanceKm"
      FROM "Tenant"
      WHERE "publicBookingEnabled" = true
        AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL
        ${nameFilter}
      ORDER BY "distanceKm" ASC
      LIMIT 20
    `);
    return Response.json({ results });
  }

  if (q.length < 2) return Response.json({ results: [] });
  const results = await prisma.tenant.findMany({
    where: { publicBookingEnabled: true, name: { contains: q, mode: 'insensitive' } },
    select: { id: true, name: true, slug: true, logoUrl: true, address: true },
    orderBy: { name: 'asc' },
    take: 20,
  });
  return Response.json({ results });
}
