// POST /api/import/apply - recebe { entity, mapping, rows, dryRun }. dryRun:true só reporta
// a disposição de cada linha (nada gravado); false grava. O cliente manda em lotes (<=1000)
// e acumula. dryRun é fail-safe: só grava quando explicitamente `false`.

import { getCurrentUserAndTenant, isAdmin } from '@/lib/auth';
import type { EntityId, Mapping, Row } from '@/lib/import/mapping';
import { applyImport } from '@/lib/import/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENTITIES = ['contacts', 'services', 'appointments'];
const MAX_ROWS_PER_REQUEST = 1000;

export async function POST(req: Request) {
  const user = await getCurrentUserAndTenant();
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
  if (!isAdmin(user))
    return Response.json({ error: 'Apenas o dono pode importar dados' }, { status: 403 });

  let body: { entity?: string; mapping?: unknown; rows?: unknown; dryRun?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const entity = body.entity ?? '';
  if (!ENTITIES.includes(entity))
    return Response.json({ error: 'Entidade inválida' }, { status: 400 });
  if (!Array.isArray(body.rows)) return Response.json({ error: 'rows ausente' }, { status: 400 });
  if (body.rows.length > MAX_ROWS_PER_REQUEST) {
    return Response.json(
      { error: `Máximo de ${MAX_ROWS_PER_REQUEST} linhas por requisição` },
      { status: 413 },
    );
  }
  if (!body.mapping || typeof body.mapping !== 'object') {
    return Response.json({ error: 'mapping ausente' }, { status: 400 });
  }

  const dryRun = body.dryRun !== false;
  const result = await applyImport(
    { id: user.tenant.id, timezone: user.tenant.timezone },
    entity as EntityId,
    body.rows as Row[],
    body.mapping as Mapping,
    dryRun,
  );
  return Response.json(result);
}
