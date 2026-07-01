// POST /api/mobile/v1/appointments/[id]/reschedule - remarca. Body: { newStartsAtIso }.
import { rescheduleOwnedAppointment } from '@/lib/customer-appointments';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { newStartsAtIso?: unknown } | null;
  const iso = typeof body?.newStartsAtIso === 'string' ? body.newStartsAtIso : '';
  const newStartsAt = new Date(iso);
  if (Number.isNaN(newStartsAt.getTime())) {
    return Response.json({ error: 'Data inválida' }, { status: 400 });
  }
  if (newStartsAt <= new Date()) {
    return Response.json({ error: 'Não dá pra remarcar pro passado' }, { status: 400 });
  }

  const result = await rescheduleOwnedAppointment(account, id, newStartsAt);
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
