// POST /api/mobile/v1/tenants/[slug]/pay - gera a cobrança (Pix/cartão) de um
// agendamento. Body: { appointmentId, method: 'PIX'|'CREDIT_CARD', document? }. Reusa a
// mesma lógica de gateway do web (createPaymentForAppointment). Sempre responde 200: o
// app inspeciona `ok` / `error` / `needsDocument` (fluxo de CPF).
import { createPaymentForAppointment } from '@/app/[slug]/payments-actions';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { withinRateLimit } from '@/lib/ratelimit';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // Cada chamada pode criar cobrança no gateway (custo real). É o público mais sensível.
  if (!(await withinRateLimit(req, 'pay', 6, 60)))
    return Response.json({ error: 'Muitas requisições. Tente em instantes.' }, { status: 429 });

  // Exige sessão: sem isso, quem soubesse um appointmentId alheio gerava cobrança e
  // sobrescrevia o CPF do contato da vítima. O app é login-gated, então sempre há Bearer.
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    appointmentId?: unknown;
    method?: unknown;
    document?: unknown;
  } | null;

  const appointmentId = typeof body?.appointmentId === 'string' ? body.appointmentId : '';
  const method = body?.method === 'PIX' || body?.method === 'CREDIT_CARD' ? body.method : null;
  const document = typeof body?.document === 'string' ? body.document : undefined;

  if (!appointmentId || !method) {
    return Response.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const result = await createPaymentForAppointment(
    slug,
    appointmentId,
    method,
    document,
    account.id,
  );
  return Response.json(result);
}
