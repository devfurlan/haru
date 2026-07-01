// POST /api/mobile/v1/appointments/[id]/cancel - cancela um agendamento do cliente.
import { cancelOwnedAppointment } from '@/lib/customer-appointments';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const result = await cancelOwnedAppointment(account, id);
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
