// Programa de fidelidade (cartão de carimbos) - lógica compartilhada painel + actions.
//
// DECISÃO DE MODELO: os CARIMBOS não são gravados. Um carimbo = um agendamento que já
// aconteceu e não foi cancelado nem deu falta (mesma regra de `isReviewable` em
// lib/appointment-status.ts). Assim o cartão enche sozinho ("ganha carimbo sozinho",
// como no protótipo) sem hook no fluxo de atendimento nem ledger pra manter em sync.
// O único estado por cliente é o RESGATE (LoyaltyRedemption): ele zera o cartão a
// partir de `redeemedAt`. Carimbos = agendamentos elegíveis DEPOIS do último resgate.
//
// ponytail: overview carrega os agendamentos elegíveis (limitados pela validade) em
// memória e agrega em JS. Suficiente pro porte de um estabelecimento; migrar pra
// agregação em SQL se algum tenant passar de ~dezenas de milhares de agendamentos.

import { prisma } from '@haru/database';

import {
  prizeLabelOf,
  TTL_OPTIONS,
  type LoyaltyCountMode,
  type LoyaltyPrizeKind,
  type LoyaltyProgramView,
} from '@/lib/loyalty-constants';

export type { LoyaltyProgramView } from '@/lib/loyalty-constants';
export { prizeLabelOf } from '@/lib/loyalty-constants';

export interface LoyaltyRow {
  contactId: string;
  name: string;
  initials: string;
  stamps: number;
  required: number;
  won: boolean;
}

export interface LoyaltyOverview {
  program: LoyaltyProgramView;
  monthLabel: string;
  stats: { participating: number; stampsThisMonth: number; redeemed: number };
  rows: LoyaltyRow[];
  prizeLabel: string;
  ruleLabel: string;
  countLabel: string;
  validityLabel: string;
}

/** Iniciais (até 2 letras) de um nome. */
function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const a = parts[0][0] ?? '';
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (a + b).toUpperCase() || '?';
}

function validityLabelOf(days: number | null): string {
  if (days == null) return 'Carimbos não expiram';
  const match = TTL_OPTIONS.find((o) => o.days === days);
  const human = match ? match.label.toLowerCase() : `${Math.round(days / 30)} meses`;
  return `Carimbos valem ${human}`;
}

const PROGRAM_INCLUDE = {
  prizeService: { select: { name: true } },
  qualifyingServices: { select: { serviceId: true } },
} as const;

function toView(program: {
  id: string;
  stampsRequired: number;
  prizeKind: LoyaltyPrizeKind;
  prizeServiceId: string | null;
  discountPercent: number | null;
  countMode: LoyaltyCountMode;
  stampTtlDays: number | null;
  pausedAt: Date | null;
  prizeService: { name: string } | null;
  qualifyingServices: { serviceId: string }[];
}): LoyaltyProgramView {
  return {
    id: program.id,
    stampsRequired: program.stampsRequired,
    prizeKind: program.prizeKind,
    prizeServiceId: program.prizeServiceId,
    prizeServiceName: program.prizeService?.name ?? null,
    discountPercent: program.discountPercent,
    countMode: program.countMode,
    qualifyingServiceIds: program.qualifyingServices.map((s) => s.serviceId),
    stampTtlDays: program.stampTtlDays,
    paused: program.pausedAt != null,
  };
}

/** Programa do tenant (ou null se não existir). */
export async function getLoyaltyProgram(tenantId: string): Promise<LoyaltyProgramView | null> {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { tenantId },
    include: PROGRAM_INCLUDE,
  });
  return program ? toView(program) : null;
}

/** Início do mês corrente (meia-noite) lido no fuso do tenant, como instante UTC. */
function monthStartInTz(now: Date, tz: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  // ponytail: usa meia-noite UTC do 1º dia; o "carimbos no mês" pode variar em horas na
  // virada do mês. Aceitável pra uma métrica de vitrine.
  return new Date(Date.UTC(y, m - 1, 1));
}

/**
 * Overview completo do programa ativo: regra em texto, estatísticas e a lista "perto do
 * prêmio". Retorna null se o tenant não tem programa. `program` deve ser o do tenant.
 */
export async function getLoyaltyOverview(
  tenantId: string,
  tz: string,
): Promise<LoyaltyOverview | null> {
  const program = await getLoyaltyProgram(tenantId);
  if (!program) return null;

  const now = new Date();
  // Programa pausado congela a contagem em pausedAt; senão, conta até agora.
  const upper = program.paused
    ? ((
        await prisma.loyaltyProgram.findUnique({
          where: { id: program.id },
          select: { pausedAt: true },
        })
      )?.pausedAt ?? now)
    : now;
  const ttlFloor =
    program.stampTtlDays != null
      ? new Date(now.getTime() - program.stampTtlDays * 86_400_000)
      : null;

  const [appts, redemptions] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId,
        startsAt: { lt: upper, ...(ttlFloor ? { gte: ttlFloor } : {}) },
        status: { notIn: ['CANCELED', 'NO_SHOW'] },
        ...(program.countMode === 'SPECIFIC'
          ? {
              serviceId: {
                in: program.qualifyingServiceIds.length
                  ? program.qualifyingServiceIds
                  : ['__none__'],
              },
            }
          : {}),
      },
      select: { contactId: true, startsAt: true, contact: { select: { name: true } } },
    }),
    prisma.loyaltyRedemption.findMany({
      where: { programId: program.id },
      select: { contactId: true, redeemedAt: true },
    }),
  ]);

  // Corte por cliente = data do último resgate (carimbos só contam depois dele).
  const cutoff = new Map<string, number>();
  for (const r of redemptions) {
    const t = r.redeemedAt.getTime();
    if (t > (cutoff.get(r.contactId) ?? 0)) cutoff.set(r.contactId, t);
  }

  const monthStart = monthStartInTz(now, tz).getTime();
  let stampsThisMonth = 0;
  const byContact = new Map<string, { name: string | null; stamps: number }>();
  for (const a of appts) {
    const started = a.startsAt.getTime();
    if (started >= monthStart) stampsThisMonth += 1;
    if (started <= (cutoff.get(a.contactId) ?? 0)) continue; // já resgatado
    const entry = byContact.get(a.contactId) ?? { name: a.contact.name, stamps: 0 };
    entry.stamps += 1;
    byContact.set(a.contactId, entry);
  }

  const required = program.stampsRequired;
  const rows: LoyaltyRow[] = [...byContact.entries()]
    .map(([contactId, v]) => ({
      contactId,
      name: v.name?.trim() || 'Cliente',
      initials: initials(v.name),
      stamps: v.stamps,
      required,
      won: v.stamps >= required,
    }))
    .sort((a, b) => Number(b.won) - Number(a.won) || b.stamps - a.stamps)
    .slice(0, 8);

  const prizeLabel = prizeLabelOf(program);

  return {
    program,
    monthLabel: new Intl.DateTimeFormat('pt-BR', { timeZone: tz, month: 'long' }).format(now),
    stats: {
      participating: byContact.size,
      stampsThisMonth,
      redeemed: redemptions.length,
    },
    rows,
    prizeLabel,
    ruleLabel: `A cada ${required} carimbos, ${prizeLabel}`,
    countLabel:
      program.countMode === 'ALL_SERVICES'
        ? 'Vale qualquer serviço'
        : 'Vale em serviços específicos',
    validityLabel: validityLabelOf(program.stampTtlDays),
  };
}

/** Carimbos atuais de UM cliente (usado no resgate, pra validar que ganhou). */
export async function stampsForContact(
  program: LoyaltyProgramView & { pausedAt?: Date | null },
  tenantId: string,
  contactId: string,
): Promise<number> {
  const now = new Date();
  const ttlFloor =
    program.stampTtlDays != null
      ? new Date(now.getTime() - program.stampTtlDays * 86_400_000)
      : null;

  const lastRedemption = await prisma.loyaltyRedemption.findFirst({
    where: { programId: program.id, contactId },
    orderBy: { redeemedAt: 'desc' },
    select: { redeemedAt: true },
  });
  const floor = [ttlFloor, lastRedemption?.redeemedAt].filter(Boolean) as Date[];
  const lowerBound = floor.length ? new Date(Math.max(...floor.map((d) => d.getTime()))) : null;

  return prisma.appointment.count({
    where: {
      tenantId,
      contactId,
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      startsAt: { lt: now, ...(lowerBound ? { gt: lowerBound } : {}) },
      ...(program.countMode === 'SPECIFIC'
        ? {
            serviceId: {
              in: program.qualifyingServiceIds.length ? program.qualifyingServiceIds : ['__none__'],
            },
          }
        : {}),
    },
  });
}
