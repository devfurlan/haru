// GET /api/mobile/v1/appointments - agendamentos do cliente (cross-tenant), separados
// em upcoming/past. Mesma leitura do portal web (/conta/agendamentos). As datas saem
// como ISO no JSON.
import { getCustomerAppointments } from '@/lib/customer';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { getCustomerReviewsMap } from '@/lib/reviews';

export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const [data, reviewsMap] = await Promise.all([
    getCustomerAppointments(account),
    getCustomerReviewsMap(account),
  ]);
  // reviews: { [tenantId]: nota } - alimenta o chip "sua nota"/botão "Avaliar" no histórico.
  return Response.json({ ...data, reviews: Object.fromEntries(reviewsMap) });
}
