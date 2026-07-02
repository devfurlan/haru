// POST /api/mobile/v1/auth/oauth - garante o CustomerAccount depois do login com Google
// no app. O app já trocou o code por sessão (Supabase) e manda o Bearer; aqui a gente
// cria a conta do domínio se ainda não existir. Idempotente: serve login e cadastro.
import { ensureCustomerAccount, getBearerUser } from '@/lib/customer-auth';
import { withinRateLimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  if (!(await withinRateLimit(req, 'oauth', 10, 60)))
    return Response.json({ error: 'Muitas tentativas. Tente em instantes.' }, { status: 429 });

  const user = await getBearerUser(req);
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const result = await ensureCustomerAccount(user);
  if ('error' in result) {
    // e-mail já pertence a uma conta com senha (outro authId) - não duplica.
    return Response.json(
      { error: 'Esse e-mail já tem conta com senha. Entre com sua senha.' },
      { status: 409 },
    );
  }

  return Response.json({ ok: true });
}
