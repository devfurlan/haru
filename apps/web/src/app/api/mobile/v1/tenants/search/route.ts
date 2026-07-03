// GET /api/mobile/v1/tenants/search - diretório de estabelecimentos do app. Exige Bearer
// (só clientes logados) pra não virar scraping aberto. A busca em si (nome + slug, sem
// acento, + proximidade) vive em @/lib/tenant-directory, compartilhada com o bot de suporte.
//
// Params: q (>= 2 chars, filtra por nome/slug), lat+lng (ordena por proximidade). Combináveis.
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { searchDirectory } from '@/lib/tenant-directory';

export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  // ausente/vazio/só-espaço -> NaN (Number('') e Number(' ') dariam 0 e falsariam geo em 0,0).
  const latRaw = sp.get('lat');
  const lngRaw = sp.get('lng');
  const results = await searchDirectory({
    q: sp.get('q') ?? undefined,
    lat: latRaw?.trim() ? Number(latRaw) : NaN,
    lng: lngRaw?.trim() ? Number(lngRaw) : NaN,
  });
  return Response.json({ results });
}
