// /api/mobile/v1/me - conta do cliente autenticado (app mobile).
//   GET    - dados básicos + cadastro (document/birthDate) + preferência de e-mail.
//   PATCH  - atualiza nome/CPF/nascimento e/ou a preferência de e-mails de agendamento.
//   DELETE - exclui a conta (irreversível; exigido pelas app stores).
import {
  deleteCustomerAccount,
  getCustomerProfile,
  setCustomerNotifications,
  updateCustomerProfileCore,
} from '@/lib/customer';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

/** "YYYY-MM-DD" de uma data guardada como meia-noite UTC (pro input de data no app). */
function toYMD(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const profile = await getCustomerProfile(account);

  return Response.json({
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    pendingPhone: account.pendingPhone,
    phoneVerified: account.phone != null,
    avatarUrl: account.avatarUrl,
    document: profile.document,
    birthDate: profile.birthDate ? toYMD(profile.birthDate) : null,
    appointmentEmailsEnabled: account.appointmentEmailsEnabled,
  });
}

export async function PATCH(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    document?: unknown;
    birthDate?: unknown;
    appointmentEmailsEnabled?: unknown;
  } | null;

  if (typeof body?.appointmentEmailsEnabled === 'boolean') {
    const result = await setCustomerNotifications(account, body.appointmentEmailsEnabled);
    if ('error' in result) return Response.json(result, { status: 400 });
  }

  if (typeof body?.name === 'string') {
    const result = await updateCustomerProfileCore(account, {
      name: body.name,
      document: typeof body.document === 'string' ? body.document : undefined,
      birthDate: typeof body.birthDate === 'string' ? body.birthDate : undefined,
    });
    if ('error' in result) return Response.json(result, { status: 400 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const result = await deleteCustomerAccount(account);
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json({ ok: true });
}
