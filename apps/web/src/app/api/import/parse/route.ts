// POST /api/import/parse - recebe FormData(file, entity, source), parseia a planilha
// server-side (SheetJS fora do bundle do cliente) e devolve headers + linhas + o palpite
// de de-para. Route handler (não server action) pra não esbarrar no limite de 1 MB.

import { getCurrentUserAndTenant, isAdmin } from '@/lib/auth';
import { type EntityId, guessMapping, type SourceId } from '@/lib/import/mapping';
import { parseTable } from '@/lib/import/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENTITIES = ['contacts', 'services', 'appointments'];
const SOURCES = ['appbarber', 'trinks', 'generic'];
const MAX_FILE_BYTES = 8_000_000;
const MAX_ROWS = 5000;

export async function POST(req: Request) {
  const user = await getCurrentUserAndTenant();
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
  if (!isAdmin(user))
    return Response.json({ error: 'Apenas o dono pode importar dados' }, { status: 403 });

  const form = await req.formData();
  const file = form.get('file');
  const entity = String(form.get('entity') ?? '');
  const source = String(form.get('source') ?? 'generic');

  if (!ENTITIES.includes(entity))
    return Response.json({ error: 'Entidade inválida' }, { status: 400 });
  if (!(file instanceof File) || file.size === 0)
    return Response.json({ error: 'Arquivo ausente' }, { status: 400 });
  if (file.size > MAX_FILE_BYTES)
    return Response.json({ error: 'Arquivo muito grande (máx 8 MB)' }, { status: 413 });

  let parsed;
  try {
    parsed = parseTable(Buffer.from(await file.arrayBuffer()));
  } catch {
    return Response.json(
      { error: 'Não consegui ler o arquivo. Envie .xlsx, .xls ou .csv.' },
      { status: 422 },
    );
  }
  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    return Response.json({ error: 'Planilha vazia ou sem linhas de dados.' }, { status: 422 });
  }

  const truncated = parsed.rows.length > MAX_ROWS;
  const mapping = guessMapping(
    parsed.headers,
    entity as EntityId,
    (SOURCES.includes(source) ? source : 'generic') as SourceId,
  );
  return Response.json({
    headers: parsed.headers,
    rows: truncated ? parsed.rows.slice(0, MAX_ROWS) : parsed.rows,
    mapping,
    total: parsed.rows.length,
    truncated,
  });
}
