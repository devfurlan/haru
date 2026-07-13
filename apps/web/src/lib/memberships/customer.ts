import 'server-only';

import { prisma } from '@haru/database';

/**
 * Leituras da assinatura de serviços ESCOPADAS AO CLIENTE final (app/web público) - o
 * espelho customer-side do subscriptions-panel.ts (que é escopado ao DONO). Alimenta as
 * telas "Meus créditos" / "Gerenciar assinatura" do app. Tudo on-the-fly (a base por
 * cliente é minúscula), formatação (moeda/data) feita aqui pra o app não precisar de
 * formatter. Cada assinatura roda no fuso do SEU tenant (datas de renovação/cobrança).
 *
 * "Dá acesso a crédito" (creditsUsable) = ACTIVE, ou CANCELED ainda dentro do período já
 * pago - mesma regra do consumo (memberships/credits.ts). PENDING/PAST_DUE não descontam.
 */

const BRL0 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const BRL2 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});
const brl0 = (c: number) => BRL0.format(c / 100);
const brl2 = (c: number) => BRL2.format(c / 100);

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando',
  PAID: 'Pago',
  FAILED: 'Falhou',
  CANCELED: 'Cancelado',
  EXPIRED: 'Vencido',
  REFUNDED: 'Estornado',
};

/** "Corte, Barba +2" - no máx. 2 nomes, resto vira contador. */
function labelServices(names: string[]): string {
  if (names.length === 0) return 'Serviços do plano';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

/** "12" (dia do mês, no fuso do tenant) pro "Renova dia 12". */
function fmtDayNum(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', timeZone: tz }).format(d);
}
/** "12 ago" (dia + mês curto, sem "de"/ponto), pro "Próxima cobrança" e "valem até". */
function fmtShort(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: tz })
    .format(d)
    .replace(' de ', ' ')
    .replace('.', '');
}

export type MembershipStatusLite = 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export interface CustomerMembership {
  membershipId: string;
  planId: string;
  tenantSlug: string;
  tenantName: string;
  logoUrl: string | null;
  planName: string;
  /** "Corte masculino" / "Corte, Barba +1". */
  serviceLabel: string;
  /** Serviços cobertos (composição VIVA do plano) - pro app detectar cobertura no agendar. */
  coveredServiceIds: string[];
  status: MembershipStatusLite;
  /** Status dá acesso a crédito (ACTIVE ou CANCELED-dentro-do-período). */
  creditsUsable: boolean;
  creditBalance: number;
  creditsPerCycle: number;
  /** "3 de 4" pro grid de tickets. */
  creditsLabel: string;
  rollover: boolean;
  /** Regra do plano em DESTAQUE (não letra miúda) - o cliente tem que saber. */
  ruleShort: string;
  ruleLong: string;
  priceCents: number;
  priceLabel: string;
  /** "Renova dia 12" (ACTIVE). */
  renewsLabel: string | null;
  /** "12 ago · R$ 150". */
  nextChargeLabel: string | null;
  /** "12 ago" - até quando os créditos valem (fim do período pago). */
  periodEndLabel: string | null;
  /** "•• 4242". */
  cardLabel: string | null;
  /** "vencem 20/07" (só planos sem rollover com saldo). */
  creditsExpireLabel: string | null;
  canCancel: boolean;
  /** PAST_DUE: cobrança falhou, créditos pausados. */
  payFailed: boolean;
  canceled: boolean;
}

const membershipInclude = {
  tenant: { select: { slug: true, name: true, logoUrl: true, timezone: true } },
  plan: {
    include: { services: { include: { service: { select: { id: true, name: true } } } } },
  },
} as const;

type MembershipRow = Awaited<
  ReturnType<typeof prisma.membership.findFirstOrThrow<{ include: typeof membershipInclude }>>
>;

function toCustomerMembership(m: MembershipRow, now: Date): CustomerMembership {
  const tz = m.tenant.timezone;
  const status = m.status as MembershipStatusLite;
  const usable =
    status === 'ACTIVE' ||
    (status === 'CANCELED' && !!m.currentPeriodEnd && m.currentPeriodEnd > now);
  const services = m.plan.services;
  const ruleShort = m.creditRollover
    ? 'Créditos acumulam pro mês seguinte'
    : 'Créditos vencem no fim do mês';
  const ruleLong = m.creditRollover
    ? m.rolloverCap
      ? `Não usou tudo? Sobra pro mês que vem - junta até ${m.rolloverCap}. Nada se perde.`
      : 'Não usou tudo? Sobra pro mês que vem, sem limite. Nada se perde.'
    : 'O que não usar some na renovação. Sem acúmulo.';

  return {
    membershipId: m.id,
    planId: m.planId,
    tenantSlug: m.tenant.slug,
    tenantName: m.tenant.name,
    logoUrl: m.tenant.logoUrl,
    planName: m.planName,
    serviceLabel: labelServices(services.map((s) => s.service.name)),
    coveredServiceIds: services.map((s) => s.serviceId),
    status,
    creditsUsable: usable,
    creditBalance: m.creditBalance,
    creditsPerCycle: m.creditsPerCycle,
    creditsLabel: `${m.creditBalance} de ${m.creditsPerCycle}`,
    rollover: m.creditRollover,
    ruleShort,
    ruleLong,
    priceCents: m.priceCents,
    priceLabel: brl0(m.priceCents),
    renewsLabel:
      status === 'ACTIVE' && m.currentPeriodEnd
        ? `Renova dia ${fmtDayNum(m.currentPeriodEnd, tz)}`
        : null,
    nextChargeLabel:
      status === 'ACTIVE' && m.currentPeriodEnd
        ? `${fmtShort(m.currentPeriodEnd, tz)} · ${brl0(m.priceCents)}`
        : null,
    periodEndLabel: m.currentPeriodEnd ? fmtShort(m.currentPeriodEnd, tz) : null,
    cardLabel: m.cardLast4 ? `•• ${m.cardLast4}` : null,
    creditsExpireLabel:
      !m.creditRollover && m.creditsExpireAt && m.creditBalance > 0
        ? `vencem ${fmtShort(m.creditsExpireAt, tz)}`
        : null,
    canCancel: status === 'ACTIVE' || status === 'PAST_DUE',
    payFailed: status === 'PAST_DUE',
    canceled: status === 'CANCELED',
  };
}

/**
 * Assinaturas do cliente (cross-tenant) que ele ainda deve VER: em dia, ativando, em
 * atraso, ou canceladas com crédito válido. Cancelada com período já vencido some da lista.
 */
export async function getCustomerMemberships(
  customerAccountId: string,
  now = new Date(),
): Promise<CustomerMembership[]> {
  const rows = await prisma.membership.findMany({
    where: {
      customerAccountId,
      OR: [
        { status: { in: ['PENDING', 'ACTIVE', 'PAST_DUE'] } },
        { status: 'CANCELED', currentPeriodEnd: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: membershipInclude,
  });
  return rows.map((m) => toCustomerMembership(m, now));
}

/** Um movimento de crédito (ledger) pra tela "Gerenciar" - onde o crédito entrou/saiu. */
export interface CreditActivity {
  dateLabel: string;
  label: string;
  sub: string | null;
  /** >0 entrou (renovação/estorno), <0 saiu (uso/vencimento). */
  delta: number;
}

export interface CustomerMembershipDetail extends CustomerMembership {
  /** Cobranças (aba "Cobranças"). */
  history: { dateLabel: string; amountLabel: string; statusLabel: string; paid: boolean }[];
  /** Movimento de créditos (aba "Créditos") - do MembershipCreditLedger, fonte da verdade do saldo. */
  creditActivity: CreditActivity[];
}

/**
 * Uma assinatura + histórico de cobranças (tela "Gerenciar"). Trava por customerAccountId
 * (dono do pagamento) - o espelho customer-side de getMembershipHistory (que trava por tenant).
 */
export async function getCustomerMembershipDetail(
  customerAccountId: string,
  membershipId: string,
  now = new Date(),
): Promise<CustomerMembershipDetail | null> {
  const m = await prisma.membership.findFirst({
    where: { id: membershipId, customerAccountId },
    include: membershipInclude,
  });
  if (!m) return null;

  const tz = m.tenant.timezone;
  const fullDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: tz,
  });
  const charges = await prisma.membershipCharge.findMany({
    where: { membershipId, tenantId: m.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 24,
    select: { amountCents: true, status: true, paidAt: true, createdAt: true },
  });

  const ledger = await prisma.membershipCreditLedger.findMany({
    where: { membershipId },
    orderBy: { createdAt: 'desc' },
    take: 24,
    select: {
      delta: true,
      reason: true,
      createdAt: true,
      appointment: {
        select: { service: { select: { name: true } }, professional: { select: { name: true } } },
      },
    },
  });

  return {
    ...toCustomerMembership(m, now),
    history: charges.map((c) => ({
      dateLabel: fullDate.format(c.paidAt ?? c.createdAt),
      amountLabel: brl2(c.amountCents),
      statusLabel: PAYMENT_STATUS_LABEL[c.status] ?? c.status,
      paid: c.status === 'PAID',
    })),
    creditActivity: ledger.map((l) => ({
      dateLabel: fmtShort(l.createdAt, tz),
      ...creditActivityText(l.reason, l.appointment),
      delta: l.delta,
    })),
  };
}

/** Rótulo humano de um movimento do ledger (usa o agendamento quando o crédito foi usado). */
function creditActivityText(
  reason: string,
  appt: { service: { name: string }; professional: { name: string | null } } | null,
): { label: string; sub: string | null } {
  switch (reason) {
    case 'CYCLE_GRANT':
      return { label: 'Renovação do plano', sub: 'créditos liberados' };
    case 'REDEEM':
      return {
        label: appt?.service.name ?? 'Crédito usado',
        sub: appt?.professional.name ? `com ${appt.professional.name}` : 'agendamento',
      };
    case 'REVERSAL':
      return { label: appt?.service.name ?? 'Crédito devolvido', sub: 'agendamento cancelado' };
    case 'EXPIRE':
      return { label: 'Créditos vencidos', sub: 'fim do ciclo' };
    default:
      return { label: 'Ajuste de créditos', sub: 'suporte' };
  }
}
