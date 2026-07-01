// POST /api/mobile/v1/tenants/[slug]/slots - horários livres pra agendar do zero.
// Body: { serviceId, dateStr, professionalId? }. Sem auth (vitrine pública).
import { getPublicSlots } from '@/lib/public-booking';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as
    | { serviceId?: unknown; dateStr?: unknown; professionalId?: unknown }
    | null;
  const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : '';
  const dateStr = typeof body?.dateStr === 'string' ? body.dateStr : '';
  const professionalId = typeof body?.professionalId === 'string' ? body.professionalId : undefined;

  const slots = await getPublicSlots(slug, serviceId, dateStr, professionalId);
  return Response.json({ slots });
}
