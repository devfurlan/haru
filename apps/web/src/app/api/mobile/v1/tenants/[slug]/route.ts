// GET /api/mobile/v1/tenants/[slug] - dados públicos do negócio (deep link do app).
// Sem auth: é a vitrine pública de agendamento.
import { getPublicTenantData } from '@/lib/public-booking';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getPublicTenantData(slug);
  if (!tenant) return Response.json({ error: 'Negócio não encontrado' }, { status: 404 });
  return Response.json(tenant);
}
