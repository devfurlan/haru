import 'server-only';

import { prisma } from '@haru/database';
import type { Prisma, SupportCategory } from '@haru/database';

import { sendEmail } from '@/lib/email';

import { runSupportAI, type SupportFeedback, type SupportTurn } from './ai';
import { buildSystemPrompt } from './prompts';

// Núcleo compartilhado do suporte, usado pela server action (web) e pela rota mobile.
// Um único ponto: valida input, monta contexto, chama a IA, persiste os dois turnos e,
// quando há feedback, e-mail pro time. Nada é respondido in-app pelo fundador.

const SUPPORT_INBOX = process.env.SUPPORT_INBOX_EMAIL ?? 'contato@demandae.com';
const MAX_BODY = 2000;
const CONTEXT_TURNS = 20;
const HISTORY_LIMIT = 200;

export type SupportAuthor =
  | {
      channel: 'WEB';
      userId: string;
      tenantId: string;
      name: string | null;
      email: string;
      tenantName: string;
    }
  | {
      channel: 'MOBILE';
      customerAccountId: string;
      name: string | null;
      email: string;
      establishments: { id: string; name: string }[];
    };

export type SupportTurnPublic = { role: 'USER' | 'ASSISTANT'; body: string; createdAt: string };

function authorWhere(a: SupportAuthor): Prisma.SupportMessageWhereInput {
  return a.channel === 'WEB'
    ? { userId: a.userId }
    : { customerAccountId: a.customerAccountId };
}

/** Colunas de identidade gravadas em cada mensagem, conforme o canal. */
function authorColumns(a: SupportAuthor) {
  return a.channel === 'WEB'
    ? { channel: 'WEB' as const, userId: a.userId, tenantId: a.tenantId }
    : { channel: 'MOBILE' as const, customerAccountId: a.customerAccountId };
}

/** Histórico completo (para render na UI), em ordem cronológica. */
export async function getSupportHistory(a: SupportAuthor): Promise<SupportTurnPublic[]> {
  const rows = await prisma.supportMessage.findMany({
    where: authorWhere(a),
    orderBy: { createdAt: 'asc' },
    take: HISTORY_LIMIT,
    select: { role: true, body: true, createdAt: true },
  });
  return rows.map((r) => ({ role: r.role, body: r.body, createdAt: r.createdAt.toISOString() }));
}

/** Processa um turno do usuário e devolve a resposta do assistente. */
export async function respondToSupport(
  a: SupportAuthor,
  rawMessage: string,
): Promise<{ reply: string }> {
  const message = rawMessage.trim().slice(0, MAX_BODY);
  if (!message) throw new Error('Mensagem vazia.');

  // Contexto: últimos N turnos em ordem cronológica.
  const recent = await prisma.supportMessage.findMany({
    where: authorWhere(a),
    orderBy: { createdAt: 'desc' },
    take: CONTEXT_TURNS,
    select: { role: true, body: true },
  });
  const history: SupportTurn[] = recent
    .reverse()
    .map((r) => ({ role: r.role === 'USER' ? 'user' : 'assistant', content: r.body }));

  const { reply, feedback } = await runSupportAI(buildSystemPrompt(a), history, message);

  // Só aceita um id de estabelecimento que seja de fato do cliente (mobile).
  const aboutTenantId =
    a.channel === 'MOBILE' && feedback?.sobreEstabelecimentoId
      ? (a.establishments.find((e) => e.id === feedback.sobreEstabelecimentoId)?.id ?? null)
      : null;

  const cols = authorColumns(a);
  await prisma.supportMessage.createMany({
    data: [
      {
        ...cols,
        role: 'USER',
        body: message,
        feedbackCategory: (feedback?.categoria ?? null) as SupportCategory | null,
        aboutTenantId,
      },
      { ...cols, role: 'ASSISTANT', body: reply },
    ],
  });

  if (feedback) {
    // Fire-and-forget: um e-mail que falha não pode derrubar a resposta ao usuário.
    void notifyFeedback(a, feedback, message, aboutTenantId);
  }

  return { reply };
}

async function notifyFeedback(
  a: SupportAuthor,
  feedback: SupportFeedback,
  message: string,
  aboutTenantId: string | null,
): Promise<void> {
  const origem = a.channel === 'WEB' ? 'painel (dono)' : 'app (cliente)';
  const quem =
    a.channel === 'WEB'
      ? `${a.name ?? 'sem nome'} <${a.email}> - negócio: ${a.tenantName}`
      : `${a.name ?? 'sem nome'} <${a.email}> - cliente do app`;
  const estabNome =
    a.channel === 'MOBILE' && aboutTenantId
      ? (a.establishments.find((e) => e.id === aboutTenantId)?.name ?? aboutTenantId)
      : null;

  const rows: [string, string][] = [
    ['Categoria', feedback.categoria],
    ['Origem', origem],
    ['De', quem],
    ...(estabNome ? ([['Sobre o estabelecimento', estabNome]] as [string, string][]) : []),
    ['Resumo', feedback.resumo],
  ];
  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#888;white-space:nowrap">${k}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
    )
    .join('');
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:18px">Novo feedback de suporte</h2>
      <table style="font-size:14px;border-collapse:collapse">${table}</table>
      <p style="font-size:14px;margin-top:16px"><strong>Mensagem:</strong></p>
      <blockquote style="font-size:14px;line-height:1.6;border-left:3px solid #eee;margin:8px 0;padding-left:12px;color:#333">${escapeHtml(message)}</blockquote>
      <p style="font-size:12px;color:#888">Demandaê - suporte in-app.</p>
    </div>`;

  await sendEmail(SUPPORT_INBOX, `[Suporte] ${feedback.categoria} - ${origem}`, html);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
