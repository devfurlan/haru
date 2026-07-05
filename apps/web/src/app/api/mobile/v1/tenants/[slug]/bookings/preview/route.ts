// POST /api/mobile/v1/tenants/[slug]/bookings/preview - prévia editável de uma série.
// Body: { serviceId, professionalId?, slotIso, frequency, occurrences }. Devolve cada
// ocorrência (mesmo dia-da-semana/horário do 1º slot) com status + horários livres do
// dia, pro app deixar trocar/remover antes de confirmar. Só leitura; a criação re-valida.
import type { RecurrenceFrequency } from '@haru/database';

import { previewPublicSeries } from '@/lib/public-series';
import { withinRateLimit } from '@/lib/ratelimit';

const FREQUENCIES: RecurrenceFrequency[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await withinRateLimit(req, 'series-preview', 20, 60)))
    return Response.json({ error: 'Muitas requisições. Tente em instantes.' }, { status: 429 });

  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    serviceId?: unknown;
    professionalId?: unknown;
    slotIso?: unknown;
    frequency?: unknown;
    occurrences?: unknown;
  } | null;

  const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : '';
  const professionalId = typeof body?.professionalId === 'string' ? body.professionalId : undefined;
  const slotIso = typeof body?.slotIso === 'string' ? body.slotIso : '';
  const freq = body?.frequency;
  const occ = typeof body?.occurrences === 'number' ? Math.trunc(body.occurrences) : 0;

  if (typeof freq !== 'string' || !FREQUENCIES.includes(freq as RecurrenceFrequency) || occ < 2) {
    return Response.json({ error: 'Recorrência inválida' }, { status: 400 });
  }

  const result = await previewPublicSeries({
    slug,
    serviceId,
    professionalId,
    firstStartsAtIso: slotIso,
    frequency: freq as RecurrenceFrequency,
    occurrences: occ,
  });
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json({ professionalId: result.professionalId, occurrences: result.occurrences });
}
