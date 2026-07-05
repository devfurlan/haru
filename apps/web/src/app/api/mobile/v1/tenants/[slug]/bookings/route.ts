// POST /api/mobile/v1/tenants/[slug]/bookings - cria um agendamento (avulso ou série).
// Body: { serviceId, professionalId?, slotIso, name, phone, frequency?, occurrences? }.
// Com frequency (WEEKLY|BIWEEKLY|MONTHLY) + occurrences, cria uma série recorrente. Auth
// opcional: se vier um Bearer válido e o telefone bater com a conta, o contato é vinculado.
import type { RecurrenceFrequency } from '@haru/database';

import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { createSinglePublicBooking } from '@/lib/public-booking';
import { withinRateLimit } from '@/lib/ratelimit';

const FREQUENCIES: RecurrenceFrequency[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // Auth opcional aqui, então trava spam de agendamentos por IP (enche a agenda do tenant).
  if (!(await withinRateLimit(req, 'bookings', 8, 60)))
    return Response.json({ error: 'Muitas requisições. Tente em instantes.' }, { status: 429 });

  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    serviceId?: unknown;
    professionalId?: unknown;
    slotIso?: unknown;
    name?: unknown;
    phone?: unknown;
    frequency?: unknown;
    occurrences?: unknown;
    slotIsos?: unknown;
  } | null;

  const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : '';
  const professionalId = typeof body?.professionalId === 'string' ? body.professionalId : undefined;
  const slotIso = typeof body?.slotIso === 'string' ? body.slotIso : '';
  const name = typeof body?.name === 'string' ? body.name : '';
  const phone = typeof body?.phone === 'string' ? body.phone : '';

  // Recorrência opcional: só vira série se a frequência for válida. As ocorrências vêm
  // da prévia editável em `slotIsos` (ISO UTC, inclui a 1ª); precisa de >= 2. Sem elas,
  // cai pra avulso silenciosamente.
  const freq = body?.frequency;
  const isos = Array.isArray(body?.slotIsos)
    ? body.slotIsos.filter((s): s is string => typeof s === 'string' && s.length > 0).slice(0, 12)
    : [];
  const recurrence =
    typeof freq === 'string' && FREQUENCIES.includes(freq as RecurrenceFrequency) && isos.length >= 2
      ? { frequency: freq as RecurrenceFrequency, occurrences: isos.length, occurrenceIsos: isos }
      : undefined;

  const account = await requireCustomerAccountFromBearer(req);

  const result = await createSinglePublicBooking({
    slug,
    serviceId,
    professionalId,
    startsAt: new Date(slotIso),
    name,
    phone,
    account,
    recurrence,
  });
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
