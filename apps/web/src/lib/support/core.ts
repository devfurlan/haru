import 'server-only';

import { prisma } from '@haru/database';
import type { CustomerAccount, Prisma } from '@haru/database';

import { sendEmail } from '@/lib/email';

import { runSupportAgent, type SupportTurn } from './ai';
import { buildSystemPrompt } from './prompts';
import {
  buildSupportTools,
  executeSupportTool,
  type CapturedFeedback,
  type SupportToolContext,
} from './tools';

// Núcleo compartilhado do suporte, usado pela server action (web) e pela rota mobile.
// Valida input, monta o contexto das tools, roda o agente de IA, persiste os dois turnos
// e, quando o agente registrou feedback, manda e-mail pro time. Nada é respondido in-app
// pelo fundador.

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
      account: CustomerAccount;
      establishments: { id: string; name: string }[];
    };

export type SupportTurnPublic = { role: 'USER' | 'ASSISTANT'; body: string; createdAt: string };

function authorWhere(a: SupportAuthor): Prisma.SupportMessageWhereInput {
  return a.channel === 'WEB' ? { userId: a.userId } : { customerAccountId: a.account.id };
}

/** Colunas de identidade gravadas em cada mensagem, conforme o canal. */
function authorColumns(a: SupportAuthor) {
  return a.channel === 'WEB'
    ? { channel: 'WEB' as const, userId: a.userId, tenantId: a.tenantId }
    : { channel: 'MOBILE' as const, customerAccountId: a.account.id };
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

  const ctx: SupportToolContext = {
    channel: a.channel,
    account: a.channel === 'MOBILE' ? a.account : null,
    establishments: a.channel === 'MOBILE' ? a.establishments : [],
    captured: { feedback: null },
  };

  const { reply } = await runSupportAgent({
    instructions: buildSystemPrompt(a),
    history,
    message,
    tools: buildSupportTools(a.channel),
    execute: (name, args) => executeSupportTool(ctx, name, args),
  });

  const feedback = ctx.captured.feedback;
  const cols = authorColumns(a);
  await prisma.supportMessage.createMany({
    data: [
      {
        ...cols,
        role: 'USER',
        body: message,
        feedbackCategory: feedback?.categoria ?? null,
        aboutTenantId: feedback?.aboutTenantId ?? null,
      },
      { ...cols, role: 'ASSISTANT', body: reply },
    ],
  });

  if (feedback) {
    // Fire-and-forget: um e-mail que falha não pode derrubar a resposta ao usuário.
    void notifyFeedback(a, feedback, message);
  }

  return { reply };
}

async function notifyFeedback(
  a: SupportAuthor,
  feedback: CapturedFeedback,
  message: string,
): Promise<void> {
  const origem = a.channel === 'WEB' ? 'painel (dono)' : 'app (cliente)';
  const quem =
    a.channel === 'WEB'
      ? `${a.name ?? 'sem nome'} <${a.email}> - negócio: ${a.tenantName}`
      : `${a.account.name ?? 'sem nome'} <${a.account.email}> - cliente do app`;
  const estabNome = feedback.aboutTenantId
    ? (a.channel === 'MOBILE'
        ? (a.establishments.find((e) => e.id === feedback.aboutTenantId)?.name ??
          feedback.aboutTenantId)
        : feedback.aboutTenantId)
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
