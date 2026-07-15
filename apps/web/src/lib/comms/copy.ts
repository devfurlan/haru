import 'server-only';

import type { BillingCycle } from '@haru/database';
import { formatBRL, formatBRLShort } from '@haru/shared';

import type { WeeklyReportData } from '@/lib/weekly-report-core';

/**
 * Copy centralizado da comunicação de RETENÇÃO/BILLING do web (e-mails transacionais que
 * eu adicionei + notificações in-app de conta + params dos templates WhatsApp da
 * plataforma). Fonte única pra iterar o texto sem caçar string por string.
 *
 * Tom: brasileiro casual, curto, direto. Sem "prezado cliente", sem jargão. Hífen "-",
 * nunca travessão. Valor e data SEMPRE explícitos (nunca esconder o essencial).
 *
 * Escopo: o copy dos alertas de USO (e-mail + in-app + WhatsApp) vive no bot
 * (apps/bot/src/lib), que é dono do loop de detecção - espelhado de propósito, igual aos
 * e-mails de agendamento. Aqui fica só o que o web dispara (webhook de billing + cron de
 * renovação + ações self-service). Os e-mails de addon seguem inline em lib/billing/email.ts.
 */

function greeting(name: string | null): string {
  return name ? `Olá, ${name}!` : 'Olá!';
}

/** "R$ 1.234,56" ou string vazia quando o valor é desconhecido. */
function brl(cents: number | null | undefined): string {
  return cents != null ? formatBRL(cents) : '';
}

/** "6 de julho de 2026" - data por extenso pro corpo do e-mail. */
function dateLong(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** "06/07/2026" - data curta pro texto do sino in-app. */
function dateShort(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function isAnnual(cycle: BillingCycle): boolean {
  return cycle === 'ANNUAL' || cycle === 'ANNUAL_INSTALLMENTS';
}

// --- Notificações in-app (sino) ---------------------------------------------

/** Payload de copy de uma notificação in-app. `href` é destino relativo no app. */
export interface NotifCopy {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}

/** Cobrança da assinatura não confirmada (webhook PAST_DUE). Acionável. */
export function pastDueNotif(): NotifCopy {
  return {
    title: 'Cobrança pendente',
    body: 'Não confirmamos o pagamento da sua assinatura e o acesso foi pausado. Regularize pra reativar o bot e o painel.',
    ctaLabel: 'Regularizar',
    ctaHref: '/assinatura',
  };
}

/** Renovação chegando (cron, 7 dias antes). Informativo + convite a conferir o cartão. */
export function renewalNotif(renewsAt: Date, amountCents: number | null): NotifCopy {
  const valor = brl(amountCents);
  return {
    title: 'Sua assinatura renova em breve',
    body:
      `Renovação automática em ${dateShort(renewsAt)}${valor ? ` por ${valor}` : ''}. ` +
      'Se o cartão mudou, atualize antes pra não perder o acesso.',
    ctaLabel: 'Ver assinatura',
    ctaHref: '/assinatura',
  };
}

// --- Templates WhatsApp da plataforma (params, na ordem aprovada na Meta) ----
// Ver a seção "Templates da Meta (WhatsApp)" do README - a ORDEM tem que bater.

/** `demandae_payment_failed`: {{1}} negócio, {{2}} link p/ atualizar o cartão. */
export function paymentFailedWaParams(tenantName: string, cardUrl: string): string[] {
  return [tenantName, cardUrl];
}

/** "+12% vs a semana passada" - sufixo do comparativo, ou '' quando não há baseline. */
function deltaSuffix(deltaPct: number | null): string {
  if (deltaPct === null) return '';
  return ` (${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs a semana passada)`;
}

const pct = (rate: number): string => `${Math.round(rate * 100)}%`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * `demandae_weekly_report`: {{1}} negócio, {{2}} faturamento, {{3}} atendimentos +
 * comparecimento, {{4}} insight, {{5}} link do painel. Resumo curto: só os 2 números mais
 * fortes + a frase acionável - o e-mail é onde o dono se aprofunda.
 *
 * Params da Meta não podem ter quebra de linha nem 4+ espaços seguidos: tudo em uma linha.
 */
export function weeklyReportWaParams(
  tenantName: string,
  d: WeeklyReportData,
  reportUrl: string,
): string[] {
  return [
    tenantName,
    `${formatBRLShort(d.revenueCents)}${deltaSuffix(d.deltaPct)}`,
    `${d.attended} ${plural(d.attended, 'atendimento', 'atendimentos')} · ${pct(d.attendanceRate)} de comparecimento`,
    d.insight,
    reportUrl,
  ];
}

// --- E-mails (corpo HTML + assunto) -----------------------------------------

/**
 * Corpo do e-mail de BOAS-VINDAS (1ª ativação) com onboarding básico. HTML livre pro
 * brandedShell. Foca em 3 passos pra tirar o cliente do zero.
 */
export function welcomeBody(name: string | null, tenantName: string): string {
  return (
    `${greeting(name)} Deu tudo certo com o pagamento e a assinatura de <strong>${tenantName}</strong> está ativa. 🎉<br><br>` +
    `Pra começar com o pé direito, três passos rápidos:<br><br>` +
    `<strong>1. Monte sua agenda</strong> - cadastre seus serviços e horários de atendimento.<br>` +
    `<strong>2. Conecte seu WhatsApp</strong> - é por ele que seus clientes vão agendar.<br>` +
    `<strong>3. Compartilhe seu link</strong> - divulgue sua página de agendamento pra encher a agenda.<br><br>` +
    `Qualquer dúvida, é só responder este e-mail que a gente te ajuda. Bom trabalho!`
  );
}

/** Assunto + corpo do e-mail de RENOVAÇÃO PRÓXIMA (7 dias antes; ênfase no anual). */
export function renewalUpcomingEmail(
  name: string | null,
  tenantName: string,
  renewsAt: Date,
  amountCents: number | null,
  cycle: BillingCycle,
): { subject: string; body: string } {
  const valor = brl(amountCents);
  const nota = isAnnual(cycle)
    ? 'Como é o plano anual, vale conferir com calma se está tudo certo com seu cartão.'
    : 'Se o cartão mudou, atualize antes da data pra não perder o acesso.';
  return {
    subject: 'Sua assinatura renova em breve - Demandaê',
    body:
      `${greeting(name)} Passando pra avisar: a assinatura de <strong>${tenantName}</strong> ` +
      `renova automaticamente em <strong>${dateLong(renewsAt)}</strong>` +
      `${valor ? `, no valor de <strong>${valor}</strong>` : ''}.<br><br>` +
      `Você não precisa fazer nada - a cobrança é automática. ${nota}<br><br>` +
      `Se quiser trocar de plano ou rever alguma coisa, é só abrir sua assinatura.`,
  };
}

/**
 * Assunto + intro + herói + insight + painel do e-mail do RELATÓRIO SEMANAL (segunda de
 * manhã, semana anterior).
 *
 * Hierarquia importa: o faturamento vira o número-herói (é a manchete) e o insight vira
 * caixa destacada (é a única linha que pede AÇÃO). O resto é placar, em linhas curtas -
 * valor longo quebra feio na largura do card e deixa palavra órfã. Blocos condicionais
 * (fila, clube) só entram se o estabelecimento usa a feature; linha vazia seria ruído.
 */
export function weeklyReportEmail(
  name: string | null,
  tenantName: string,
  d: WeeklyReportData,
): {
  subject: string;
  intro: string;
  hero: { label: string; value: string; delta?: string; deltaUp?: boolean };
  callout: string;
  rows: { label: string; value: string }[];
} {
  const rows: { label: string; value: string }[] = [
    {
      label: 'Agendamentos',
      value:
        `${d.attended} ${plural(d.attended, 'atendido', 'atendidos')} de ${d.total}` +
        ` · ${d.canceled} ${plural(d.canceled, 'cancelado', 'cancelados')}` +
        ` · ${d.noShow} ${plural(d.noShow, 'falta', 'faltas')}`,
    },
    {
      label: 'Comparecimento',
      value: `${pct(d.attendanceRate)} (${pct(d.noShowRate)} de falta)`,
    },
    { label: 'Ticket médio', value: formatBRLShort(d.ticketCents) },
  ];

  // O número que dói: horário vazio é dinheiro que ficou na mesa.
  if (d.idleSlots > 0) {
    rows.push({
      label: 'Horários ociosos',
      value: `${d.idleSlots} ${plural(d.idleSlots, 'vazio', 'vazios')} · ${formatBRLShort(d.idleCents)} na mesa`,
    });
  }
  if (d.topServices.length > 0) {
    rows.push({
      label: `Top ${d.topServices.length === 1 ? 'serviço' : `${d.topServices.length} serviços`}`,
      value: d.topServices.map((s) => `${s.name} (${s.count})`).join(' · '),
    });
  }
  rows.push({
    label: 'Clientes',
    value: `${d.newCustomers} ${plural(d.newCustomers, 'novo', 'novos')} · ${d.returningCustomers} ${plural(d.returningCustomers, 'recorrente', 'recorrentes')}`,
  });
  if (d.recovered) {
    rows.push({
      label: 'Fila de espera',
      value: `${d.recovered.count} ${plural(d.recovered.count, 'vaga recuperada', 'vagas recuperadas')} · ${formatBRLShort(d.recovered.revenueCents)}`,
    });
  }
  if (d.club) {
    rows.push({
      label: 'Assinaturas',
      value: `${d.club.activeCount} ${plural(d.club.activeCount, 'assinante', 'assinantes')} · ${formatBRLShort(d.club.mrrCents)}/mês`,
    });
  }

  return {
    subject: `Resumo da semana (${d.weekLabel}) - Demandaê`,
    intro:
      `${greeting(name)} Foi assim a semana de <strong>${d.weekLabel}</strong> em ` +
      `<strong>${tenantName}</strong>.`,
    hero: {
      label: 'Faturamento da semana',
      value: formatBRLShort(d.revenueCents),
      // Sem baseline (estabelecimento novo) o chip some - não inventa comparativo.
      delta: d.deltaPct === null ? undefined : `${d.deltaPct >= 0 ? '+' : ''}${d.deltaPct}%`,
      deltaUp: d.deltaPct !== null && d.deltaPct >= 0,
    },
    callout: d.insight,
    rows,
  };
}

/**
 * Assunto + corpo do e-mail de CANCELAMENTO, com o detalhe do que aconteceu:
 * - `refund`: cancelou dentro da garantia (30d) - reembolso integral + acesso encerrado agora.
 * - `end_of_cycle`: cancelou fora da garantia - acesso segue até o fim do período já pago.
 */
export function canceledEmail(
  name: string | null,
  tenantName: string,
  reason: 'refund' | 'end_of_cycle',
  opts: { accessUntil?: Date | null; amountCents?: number | null },
): { subject: string; body: string } {
  const hi = greeting(name);
  if (reason === 'refund') {
    const valor = brl(opts.amountCents);
    return {
      subject: 'Seu reembolso foi processado - Demandaê',
      body:
        `${hi} Cancelamos a assinatura de <strong>${tenantName}</strong> e, como você estava dentro ` +
        `dos 30 dias de garantia, processamos o <strong>reembolso integral</strong>` +
        `${valor ? ` de <strong>${valor}</strong>` : ''}. O valor volta pro seu cartão em alguns dias, ` +
        `conforme o prazo do banco.<br><br>` +
        `Seu acesso foi encerrado agora. Se um dia quiser voltar, você é sempre bem-vindo por aqui.`,
    };
  }
  const until = opts.accessUntil ? dateLong(opts.accessUntil) : null;
  return {
    subject: 'Sua assinatura foi cancelada - Demandaê',
    body:
      `${hi} Cancelamos a assinatura de <strong>${tenantName}</strong>, como você pediu. Você não ` +
      `será mais cobrado.<br><br>` +
      (until
        ? `Seu acesso continua ativo até <strong>${until}</strong> - até lá está tudo funcionando ` +
          `normal. Depois dessa data o bot e o painel são pausados.<br><br>`
        : `Seu acesso foi encerrado.<br><br>`) +
      `Mudou de ideia? Dá pra reativar quando quiser, é só abrir sua assinatura.`,
  };
}
