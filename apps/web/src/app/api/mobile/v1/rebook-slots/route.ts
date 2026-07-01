// POST /api/mobile/v1/rebook-slots - horários livres pra "agendar de novo".
// Body: { sourceAppointmentId, serviceId, dateStr }.
import { loadRebookSlots } from '@/lib/customer-appointments';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { sourceAppointmentId?: unknown; serviceId?: unknown; dateStr?: unknown }
    | null;
  const sourceAppointmentId =
    typeof body?.sourceAppointmentId === 'string' ? body.sourceAppointmentId : '';
  const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : '';
  const dateStr = typeof body?.dateStr === 'string' ? body.dateStr : '';

  const slots = await loadRebookSlots(account, sourceAppointmentId, serviceId, dateStr);
  return Response.json({ slots });
}
