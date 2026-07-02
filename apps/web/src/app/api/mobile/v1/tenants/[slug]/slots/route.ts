// POST /api/mobile/v1/tenants/[slug]/slots - horários livres pra agendar do zero.
// Body: { serviceId, dateStr, professionalId? }. Sem auth (vitrine pública).
import { getPublicSlots } from '@/lib/public-booking';
import { withinRateLimit } from '@/lib/ratelimit';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // Cálculo de disponibilidade é o DoS mais barato aqui (público). Cap generoso: o
  // usuário legitimamente navega por vários dias/serviços.
  if (!(await withinRateLimit(req, 'slots', 30, 60)))
    return Response.json({ error: 'Muitas requisições. Tente em instantes.' }, { status: 429 });

  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    serviceId?: unknown;
    dateStr?: unknown;
    professionalId?: unknown;
  } | null;
  const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : '';
  const dateStr = typeof body?.dateStr === 'string' ? body.dateStr : '';
  const professionalId = typeof body?.professionalId === 'string' ? body.professionalId : undefined;

  const slots = await getPublicSlots(slug, serviceId, dateStr, professionalId);
  return Response.json({ slots });
}
