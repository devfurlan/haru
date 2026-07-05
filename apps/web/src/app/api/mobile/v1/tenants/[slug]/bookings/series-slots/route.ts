// POST /api/mobile/v1/tenants/[slug]/bookings/series-slots - horários de um dia pra a
// troca de dia de uma ocorrência da série. Janela de 90 dias (recorrência), profissional
// fixo (o resolvido da série). Body: { serviceId, professionalId, dateStr }. Só leitura.
import { previewSeriesDaySlots } from '@/lib/public-series';
import { withinRateLimit } from '@/lib/ratelimit';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await withinRateLimit(req, 'series-slots', 30, 60)))
    return Response.json({ error: 'Muitas requisições. Tente em instantes.' }, { status: 429 });

  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    serviceId?: unknown;
    professionalId?: unknown;
    dateStr?: unknown;
  } | null;

  const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : '';
  const professionalId = typeof body?.professionalId === 'string' ? body.professionalId : '';
  const dateStr = typeof body?.dateStr === 'string' ? body.dateStr : '';

  const slots = await previewSeriesDaySlots({ slug, serviceId, professionalId, dateStr });
  return Response.json({ slots });
}
