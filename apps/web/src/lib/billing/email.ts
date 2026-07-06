import 'server-only';

import { prisma } from '@haru/database';
import type { BillingCycle } from '@haru/database';

import { canceledEmail, renewalUpcomingEmail, welcomeBody } from '@/lib/comms/copy';
import { brandedShell } from '@/lib/email';

/**
 * E-mails transacionais de billing via Resend (REST, sem SDK). Avisos pro DONO do
 * tenant: falha de pagamento, ativação e suspensão da assinatura. Best-effort -
 * nunca derruba o webhook; se as envs não estiverem setadas, vira no-op logado.
 * Requer: RESEND_API_KEY, BILLING_EMAIL_FROM (ex.: "Demandaê <cobranca@demandae.app>").
 */

const RESEND_URL = 'https://api.resend.com/emails';

function appUrl(): string {
  return (process.env.APP_URL ?? 'https://demandae.app').replace(/\/$/, '');
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BILLING_EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[billing-email] RESEND_API_KEY/BILLING_EMAIL_FROM ausentes - e-mail não enviado');
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error('[billing-email] resend', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[billing-email] falhou', err);
    return false;
  }
}

/** Resolve o dono (OWNER) do tenant + nome do negócio para destinatário do e-mail. */
async function ownerOf(
  tenantId: string,
): Promise<{ email: string; name: string | null; tenantName: string } | null> {
  const [tenant, owner] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.user.findFirst({
      where: { tenantId, role: 'OWNER' },
      select: { email: true, name: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  if (!tenant || !owner?.email) return null;
  return { email: owner.email, name: owner.name, tenantName: tenant.name };
}

/** Casca branded (identidade única dos e-mails do produto). `path` = destino do CTA no app. */
function shell(title: string, body: string, cta: string, path = '/assinatura'): string {
  return brandedShell(title, body, cta, `${appUrl()}${path}`);
}

/** Pagamento da assinatura falhou - acesso pausado (sem carência). */
export async function emailPaymentFailed(tenantId: string): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  await sendEmail(
    o.email,
    'Falha no pagamento da sua assinatura - Demandaê',
    shell(
      'Não conseguimos confirmar seu pagamento',
      `${hi} O pagamento da assinatura de <strong>${o.tenantName}</strong> não foi confirmado e o acesso ` +
        `foi pausado. Regularize para reativar o bot e o painel - leva menos de um minuto.`,
      'Regularizar pagamento',
    ),
  );
}

/** Boas-vindas na 1ª ativação: confirma o pagamento + onboarding básico (3 passos). */
export async function emailSubscriptionActivated(tenantId: string): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  await sendEmail(
    o.email,
    'Bem-vindo ao Demandaê! Sua assinatura está ativa 🎉',
    shell('Bem-vindo ao Demandaê!', welcomeBody(o.name, o.tenantName), 'Começar agora', '/dashboard'),
  );
}

/** Recibo de uma renovação paga (a cada ciclo cobrado com sucesso). */
export async function emailPaymentReceipt(tenantId: string, amountCents: number | null): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  const valor =
    amountCents != null
      ? ` de ${(amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      : '';
  await sendEmail(
    o.email,
    'Recibo da sua assinatura - Demandaê',
    shell(
      'Pagamento recebido',
      `${hi} Recebemos o pagamento${valor} da assinatura de <strong>${o.tenantName}</strong>. ` +
        `Sua assinatura segue ativa - obrigado!`,
      'Ver assinatura',
    ),
  );
}

/**
 * Nota fiscal autorizada: manda o link do PDF pro dono do tenant. Disparado no webhook
 * INVOICE_AUTHORIZED (só quando a nota é emitida de fato pela prefeitura). Usa `brandedShell`
 * direto porque o CTA aponta pra URL absoluta hospedada do Asaas (não uma rota do app).
 */
export async function emailInvoiceIssued(
  tenantId: string,
  data: { nfUrl: string | null; nfNumber: string | null },
): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o || !data.nfUrl) return;
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  const num = data.nfNumber ? ` nº ${data.nfNumber}` : '';
  await sendEmail(
    o.email,
    'Sua nota fiscal está disponível - Demandaê',
    brandedShell(
      'Nota fiscal disponível',
      `${hi} A nota fiscal${num} da assinatura de <strong>${o.tenantName}</strong> já está disponível. ` +
        `É só baixar o PDF no botão abaixo.`,
      'Baixar nota fiscal',
      data.nfUrl,
    ),
  );
}

/** Assinatura suspensa (cancelamento/estorno/chargeback). */
export async function emailSubscriptionSuspended(tenantId: string): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  await sendEmail(
    o.email,
    'Sua assinatura foi suspensa - Demandaê',
    shell(
      'Assinatura suspensa',
      `${hi} A assinatura de <strong>${o.tenantName}</strong> foi suspensa e o acesso está bloqueado. ` +
        `Você pode reativar a qualquer momento.`,
      'Reativar assinatura',
    ),
  );
}

/**
 * Lembrete de que a assinatura renova em breve (disparado pelo cron 7 dias antes).
 * Mostra data + valor exatos. Ênfase no anual (é o ciclo com maior atrito de renovação).
 */
export async function emailRenewalUpcoming(
  tenantId: string,
  data: { renewsAt: Date; amountCents: number | null; cycle: BillingCycle },
): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const { subject, body } = renewalUpcomingEmail(
    o.name,
    o.tenantName,
    data.renewsAt,
    data.amountCents,
    data.cycle,
  );
  await sendEmail(o.email, subject, shell('Sua assinatura renova em breve', body, 'Ver assinatura'));
}

/**
 * Assinatura cancelada. `reason` decide o texto: `refund` (cancelou na garantia de 30d,
 * reembolso integral, acesso encerrado agora) ou `end_of_cycle` (acesso até `accessUntil`).
 * Disparado pela ação self-service `cancelSubscription`, que já conhece o cenário.
 */
export async function emailSubscriptionCanceled(
  tenantId: string,
  reason: 'refund' | 'end_of_cycle',
  opts: { accessUntil?: Date | null; amountCents?: number | null } = {},
): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const { subject, body } = canceledEmail(o.name, o.tenantName, reason, opts);
  const title = reason === 'refund' ? 'Reembolso processado' : 'Assinatura cancelada';
  const cta = reason === 'refund' ? 'Voltar pro Demandaê' : 'Reativar assinatura';
  await sendEmail(o.email, subject, shell(title, body, cta));
}

// --- Addon "Atendente IA no WhatsApp" ----------------------------------------

/**
 * Setup do addon (número próprio) foi PAGO - alerta OPERACIONAL pro operador (env
 * OPERATOR_EMAIL) fazer a config da WABA na Meta e depois ativar no painel admin. Não é
 * pro dono do tenant. Sem OPERATOR_EMAIL vira no-op logado (igual aos outros e-mails).
 */
export async function emailOperatorAddonSetupPaid(tenantId: string): Promise<void> {
  const to = process.env.OPERATOR_EMAIL;
  if (!to) {
    console.warn('[billing-email] OPERATOR_EMAIL ausente - alerta de setup do addon não enviado');
    return;
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true },
  });
  if (!tenant) return;
  await sendEmail(
    to,
    `Setup do Atendente IA pago - configurar WABA (${tenant.name})`,
    `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:18px">Setup do Atendente IA pago</h2>
      <p style="font-size:14px;line-height:1.6"><strong>${tenant.name}</strong> (/${tenant.slug}) pagou o setup do
      Atendente IA no <strong>número próprio</strong>. Faça a configuração da WABA na Meta (verificação de negócio,
      templates) e, ao concluir, ative o addon no painel admin (Clientes → ${tenant.name} → Ativar Atendente IA) -
      isso inicia a mensalidade e avisa o cliente.</p>
      <p style="font-size:12px;color:#888">Demandaê - alerta operacional.</p>
    </div>`,
  );
}

/** Número próprio: setup pago, avisa o tenant que a config está em andamento (sem cobrança ainda). */
export async function emailAddonAwaitingSetup(tenantId: string): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  await sendEmail(
    o.email,
    'Recebemos seu pagamento - configurando o Atendente IA',
    shell(
      'Estamos preparando seu Atendente IA',
      `${hi} Recebemos o pagamento do setup do Atendente IA de <strong>${o.tenantName}</strong>. Nossa equipe já está ` +
        `configurando a sua conta oficial no WhatsApp (Meta) - costuma levar alguns dias úteis. Assim que estiver no ar, ` +
        `a gente te avisa e só então a mensalidade começa a contar. Você não precisa fazer nada agora.`,
      'Ver assinatura',
    ),
  );
}

/**
 * Atendente IA ativado - instruções de uso conforme o canal. Número Demandaê traz o link
 * wa.me pra compartilhar com os clientes; número próprio confirma que o número do
 * estabelecimento está no ar. Ambos apontam pro painel de Conversas pra monitorar.
 */
export async function emailAddonActivated(
  tenantId: string,
  opts: { channel: 'DEMANDAE' | 'OWN'; waLink?: string | null },
): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const hi = o.name ? `Olá, ${o.name}!` : 'Olá!';
  const comoUsar =
    opts.channel === 'DEMANDAE'
      ? `Seu atendente já está no ar no número do Demandaê. Compartilhe este link com seus clientes para eles ` +
        `conversarem e agendarem:` +
        (opts.waLink
          ? `<br><a href="${opts.waLink}" style="color:#1a1a1a">${opts.waLink}</a>`
          : '')
      : `Seu atendente já está no ar no <strong>seu próprio número</strong> de WhatsApp. Divulgue seu número ` +
        `normalmente - quem chamar vai ser atendido pelo bot.`;
  await sendEmail(
    o.email,
    'Seu Atendente IA está no ar 🎉 - Demandaê',
    shell(
      'Atendente IA ativado!',
      `${hi} O Atendente IA de <strong>${o.tenantName}</strong> está ativo. ${comoUsar}<br><br>` +
        `Acompanhe e assuma as conversas quando quiser em <strong>Conversas</strong> no painel.`,
      'Abrir conversas',
      '/conversations',
    ),
  );
}
