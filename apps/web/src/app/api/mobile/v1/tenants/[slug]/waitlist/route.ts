// POST /api/mobile/v1/tenants/[slug]/waitlist - entra na fila de espera de um dia +
// profissional (agenda cheia). Body: { serviceId, professionalId, dateStr, name, phone? }.
// Auth opcional: com Bearer válido, a inscrição fica vinculada à conta (recebe push).
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { withinRateLimit } from '@/lib/ratelimit';
import { getEntryPosition, joinWaitlist } from '@/lib/waitlist';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await withinRateLimit(req, 'waitlist', 12, 60)))
    return Response.json({ error: 'Muitas requisições. Tente em instantes.' }, { status: 429 });

  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    serviceId?: unknown;
    professionalId?: unknown;
    dateStr?: unknown;
    name?: unknown;
    phone?: unknown;
  } | null;

  const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : '';
  const professionalId = typeof body?.professionalId === 'string' ? body.professionalId : '';
  const dateStr = typeof body?.dateStr === 'string' ? body.dateStr : '';
  const name = typeof body?.name === 'string' ? body.name : '';
  const phone = typeof body?.phone === 'string' ? body.phone : '';

  if (!professionalId) return Response.json({ error: 'Escolha um profissional' }, { status: 400 });

  const account = await requireCustomerAccountFromBearer(req);

  const result = await joinWaitlist({
    slug,
    serviceId,
    professionalId,
    dateStr,
    name,
    phone,
    account,
    now: new Date(),
  });
  if ('error' in result) return Response.json(result, { status: 400 });
  // Posição na fila pra a tela de sucesso ("Você é o Nº").
  const position = await getEntryPosition(result.entryId);
  return Response.json({ ...result, position });
}
