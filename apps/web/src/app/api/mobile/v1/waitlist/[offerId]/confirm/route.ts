// POST /api/mobile/v1/waitlist/[offerId]/confirm - o cliente da fila garante um horário.
// Body: { entryId, slotIso }. Auth: Bearer da conta dona da inscrição.
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { confirmWaitlistSlot } from '@/lib/waitlist';

export async function POST(req: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { offerId } = await params;
  const body = (await req.json().catch(() => null)) as {
    entryId?: unknown;
    slotIso?: unknown;
  } | null;
  const entryId = typeof body?.entryId === 'string' ? body.entryId : '';
  const slotIso = typeof body?.slotIso === 'string' ? body.slotIso : '';

  const startsAt = new Date(slotIso);
  if (Number.isNaN(startsAt.getTime()))
    return Response.json({ error: 'Horário inválido' }, { status: 400 });

  const result = await confirmWaitlistSlot({
    offerId,
    entryId,
    startsAt,
    now: new Date(),
    accountId: account.id,
  });
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
