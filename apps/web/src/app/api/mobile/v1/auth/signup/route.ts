// POST /api/mobile/v1/auth/signup - cria a conta do cliente pelo app. Espelha
// customerSignUp de (customer)/actions.ts: cria o auth do Supabase + o CustomerAccount
// com o telefone PENDENTE (verificação por OTP fica pra depois, no web). Depois disto o
// app faz signInWithPassword pra obter a sessão.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { prisma } from '@haru/database';

import { normalizePhoneBR } from '@haru/shared';

import { traduzErroSignUp } from '@/lib/auth-errors';
import { TERMS_VERSION } from '@/lib/legal';
import { withinRateLimit } from '@/lib/ratelimit';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^55\d{10,11}$/;

export async function POST(req: Request) {
  // Anti-abuso: cria auth.users + CustomerAccount a cada chamada. Throttle por IP contra
  // criação em massa de contas (que alimentaria o abuso de SMS/LLM) e enumeração de e-mail.
  if (!(await withinRateLimit(req, 'signup', 5, 60)))
    return Response.json({ error: 'Muitas tentativas. Tente em instantes.' }, { status: 429 });

  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
    phone?: unknown;
    acceptTerms?: unknown;
  } | null;

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const phone = normalizePhoneBR(typeof body?.phone === 'string' ? body.phone : '');

  if (!EMAIL_RE.test(email)) return Response.json({ error: 'Email inválido' }, { status: 400 });
  if (password.length < 8) {
    return Response.json({ error: 'Senha deve ter ao menos 8 caracteres' }, { status: 400 });
  }
  if (name.length < 2) return Response.json({ error: 'Informe seu nome' }, { status: 400 });
  if (!PHONE_RE.test(phone)) {
    return Response.json({ error: 'Celular inválido - confira o DDD' }, { status: 400 });
  }
  if (body?.acceptTerms !== true) {
    return Response.json(
      { error: 'É preciso aceitar os Termos e a Política de Privacidade.' },
      {
        status: 400,
      },
    );
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    return Response.json(
      { error: error ? traduzErroSignUp(error) : 'Falha ao criar conta' },
      {
        status: 400,
      },
    );
  }

  try {
    await prisma.customerAccount.create({
      data: {
        authId: data.user.id,
        email,
        name,
        pendingPhone: phone,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });
  } catch (err) {
    console.error('[mobile signup] falha ao criar conta do cliente', err);
    return Response.json({ error: 'Não foi possível criar sua conta' }, { status: 400 });
  }

  return Response.json({ ok: true });
}
