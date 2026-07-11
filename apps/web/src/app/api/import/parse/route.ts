// POST /api/import/parse - recebe uma ou mais planilhas (CSV/Excel), lê todas as abas,
// detecta a entidade de cada tabela pelo cabeçalho, agrupa por entidade e devolve, por
// entidade: cabeçalhos, linhas, palpite de de-para e contagem. Sem gravar nada.

import { getCurrentUserAndTenant, isAdmin } from '@/lib/auth';
import { detectEntity, type EntityId, guessMapping, type Row } from '@/lib/import/mapping';
import { parseWorkbook } from '@/lib/import/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 12_000_000;
const MAX_FILES = 8;
const MAX_ROWS = 5000;

export async function POST(req: Request) {
  const user = await getCurrentUserAndTenant();
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
  if (!isAdmin(user))
    return Response.json({ error: 'Apenas o dono pode importar dados' }, { status: 403 });

  const form = await req.formData();
  const files = form.getAll('file').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return Response.json({ error: 'Arquivo ausente' }, { status: 400 });
  if (files.length > MAX_FILES)
    return Response.json({ error: `Máximo de ${MAX_FILES} arquivos` }, { status: 413 });

  const byEntity = new Map<EntityId, { headers: string[]; headerSet: Set<string>; rows: Row[] }>();
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES)
      return Response.json(
        { error: `"${file.name}" é grande demais (máx 12 MB)` },
        { status: 413 },
      );
    let tables;
    try {
      tables = parseWorkbook(Buffer.from(await file.arrayBuffer()), file.name);
    } catch {
      return Response.json(
        { error: `Não consegui ler "${file.name}". Envie .xlsx, .xls ou .csv.` },
        { status: 422 },
      );
    }
    for (const t of tables) {
      const entity = detectEntity(t.headers);
      const bucket = byEntity.get(entity) ?? {
        headers: [],
        headerSet: new Set<string>(),
        rows: [],
      };
      for (const h of t.headers) {
        if (!bucket.headerSet.has(h)) {
          bucket.headerSet.add(h);
          bucket.headers.push(h);
        }
      }
      bucket.rows.push(...t.rows);
      byEntity.set(entity, bucket);
    }
  }

  if (byEntity.size === 0)
    return Response.json({ error: 'Planilha vazia ou sem linhas.' }, { status: 422 });

  const entities = [...byEntity.entries()].map(([entity, b]) => ({
    entity,
    headers: b.headers,
    rows: b.rows.slice(0, MAX_ROWS),
    mapping: guessMapping(b.headers, entity),
    count: b.rows.length,
    truncated: b.rows.length > MAX_ROWS,
  }));

  const fileName =
    files.length === 1 ? files[0].name : `${files[0].name} · +${files.length - 1} arquivo(s)`;
  return Response.json({ entities, fileName });
}
