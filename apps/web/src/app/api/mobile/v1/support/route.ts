// /api/mobile/v1/support - bot de suporte do app (cliente final).
//   GET  -> histórico da conversa de suporte.
//   POST { text } -> processa a mensagem e devolve { reply }.
import { prisma } from '@haru/database';
import type { CustomerAccount } from '@haru/database';

import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { getSupportHistory, respondToSupport, type SupportAuthor } from '@/lib/support/core';

// Estabelecimentos do cliente = tenants distintos dos seus Contacts. Alimenta o contexto
// da IA (responder sobre o negócio) e valida o alvo do feedback.
async function authorFor(account: CustomerAccount): Promise<SupportAuthor> {
  const contacts = await prisma.contact.findMany({
    where: { customerAccountId: account.id },
    select: { tenant: { select: { id: true, name: true } } },
  });
  const byId = new Map(contacts.map((c) => [c.tenant.id, c.tenant.name]));
  return {
    channel: 'MOBILE',
    customerAccountId: account.id,
    name: account.name,
    email: account.email,
    establishments: [...byId].map(([id, name]) => ({ id, name })),
  };
}

export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });
  const history = await getSupportHistory(await authorFor(account));
  return Response.json({ history });
}

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === 'string' ? body.text : '';
  if (!text.trim()) return Response.json({ error: 'Mensagem vazia.' }, { status: 400 });

  const { reply } = await respondToSupport(await authorFor(account), text);
  return Response.json({ reply });
}
