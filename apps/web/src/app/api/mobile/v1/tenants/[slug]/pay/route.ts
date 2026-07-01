// POST /api/mobile/v1/tenants/[slug]/pay - gera a cobrança (Pix/cartão) de um
// agendamento. Body: { appointmentId, method: 'PIX'|'CREDIT_CARD', document? }. Reusa a
// mesma lógica de gateway do web (createPaymentForAppointment). Sempre responde 200: o
// app inspeciona `ok` / `error` / `needsDocument` (fluxo de CPF).
import { createPaymentForAppointment } from '@/app/[slug]/payments-actions';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as
    | { appointmentId?: unknown; method?: unknown; document?: unknown }
    | null;

  const appointmentId = typeof body?.appointmentId === 'string' ? body.appointmentId : '';
  const method =
    body?.method === 'PIX' || body?.method === 'CREDIT_CARD' ? body.method : null;
  const document = typeof body?.document === 'string' ? body.document : undefined;

  if (!appointmentId || !method) {
    return Response.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const result = await createPaymentForAppointment(slug, appointmentId, method, document);
  return Response.json(result);
}
