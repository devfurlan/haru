// POST /api/mobile/v1/rebook - agendar de novo (1 clique) a partir de um agendamento
// existente. Body: { sourceAppointmentId, slotIso }.
import { rebookOwned } from '@/lib/customer-appointments';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { sourceAppointmentId?: unknown; slotIso?: unknown }
    | null;
  const sourceAppointmentId =
    typeof body?.sourceAppointmentId === 'string' ? body.sourceAppointmentId : '';
  const iso = typeof body?.slotIso === 'string' ? body.slotIso : '';
  const startsAt = new Date(iso);
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    return Response.json({ error: 'Horário inválido' }, { status: 400 });
  }

  const result = await rebookOwned(account, sourceAppointmentId, startsAt);
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
