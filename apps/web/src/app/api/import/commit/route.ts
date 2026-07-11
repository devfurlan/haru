// POST /api/import/commit - { entity, mapping, rows, resolutions }. Grava de verdade,
// honrando as resoluções (duplicados: mesclar/ignorar; conflitos: pular/importar).

import { getCurrentUserAndTenant, isAdmin } from '@/lib/auth';
import type { EntityId, Mapping, Resolutions, Row } from '@/lib/import/mapping';
import { commitEntity } from '@/lib/import/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENTITIES = ['contacts', 'services', 'appointments', 'history'];
const MAX_ROWS = 5000;

export async function POST(req: Request) {
  const user = await getCurrentUserAndTenant();
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
  if (!isAdmin(user))
    return Response.json({ error: 'Apenas o dono pode importar dados' }, { status: 403 });

  let body: { entity?: string; mapping?: unknown; rows?: unknown; resolutions?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Corpo inválido' }, { status: 400 });
  }
  const entity = body.entity ?? '';
  if (!ENTITIES.includes(entity))
    return Response.json({ error: 'Entidade inválida' }, { status: 400 });
  if (!Array.isArray(body.rows) || body.rows.length > MAX_ROWS)
    return Response.json({ error: 'rows inválido' }, { status: 400 });
  if (!body.mapping || typeof body.mapping !== 'object')
    return Response.json({ error: 'mapping ausente' }, { status: 400 });

  const result = await commitEntity(
    { id: user.tenant.id, timezone: user.tenant.timezone },
    entity as EntityId,
    body.rows as Row[],
    body.mapping as Mapping,
    (body.resolutions ?? undefined) as Resolutions | undefined,
  );
  return Response.json(result);
}
