// POST /api/mobile/v1/tenants/[slug]/bookings - cria um agendamento avulso (do zero).
// Body: { serviceId, professionalId?, slotIso, name, phone }. Auth opcional: se vier um
// Bearer válido e o telefone bater com a conta, o contato é vinculado à conta.
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { createSinglePublicBooking } from '@/lib/public-booking';
import { withinRateLimit } from '@/lib/ratelimit';

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
  } | null;

  const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : '';
  const professionalId = typeof body?.professionalId === 'string' ? body.professionalId : undefined;
  const slotIso = typeof body?.slotIso === 'string' ? body.slotIso : '';
  const name = typeof body?.name === 'string' ? body.name : '';
  const phone = typeof body?.phone === 'string' ? body.phone : '';

  const account = await requireCustomerAccountFromBearer(req);

  const result = await createSinglePublicBooking({
    slug,
    serviceId,
    professionalId,
    startsAt: new Date(slotIso),
    name,
    phone,
    account,
  });
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
