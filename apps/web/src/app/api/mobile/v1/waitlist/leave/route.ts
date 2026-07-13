// POST /api/mobile/v1/waitlist/leave - sai da fila de um (tenant, profissional, dia).
// Body: { slug, professionalId, dateStr }. Auth: Bearer da conta dona da inscrição.
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { leaveWaitlist } from '@/lib/waitlist';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    slug?: unknown;
    professionalId?: unknown;
    dateStr?: unknown;
  } | null;
  const slug = typeof body?.slug === 'string' ? body.slug : '';
  const professionalId = typeof body?.professionalId === 'string' ? body.professionalId : '';
  const dateStr = typeof body?.dateStr === 'string' ? body.dateStr : '';

  const result = await leaveWaitlist({ slug, professionalId, dateStr, accountId: account.id });
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
