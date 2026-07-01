// POST /api/mobile/v1/appointments/[id]/reschedule-slots - horários livres pra remarcar
// (mesmo profissional, excluindo o próprio agendamento). Body: { serviceId, dateStr }.
import { loadRescheduleSlots } from '@/lib/customer-appointments';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { serviceId?: unknown; dateStr?: unknown }
    | null;
  const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : '';
  const dateStr = typeof body?.dateStr === 'string' ? body.dateStr : '';

  const slots = await loadRescheduleSlots(account, id, serviceId, dateStr);
  return Response.json({ slots });
}
