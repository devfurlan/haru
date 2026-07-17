// Núcleo PURO do dashboard do dono (sem DB, sem server-only) - testável com tsx. Só janelas de
// tempo (no fuso do tenant), comparação (delta/tendência) e a escolha dos destaques. NENHUM
// cálculo de faturamento/atendimento vive aqui: os números vêm do motor (lib/metrics). Isto só
// decide QUAIS janelas consultar e COMO comparar os números que o motor devolve.

import { isoDateInTz, localWallTimeToUtc, weekdayInTz } from '@haru/shared';

import { addDays } from './weekly-report-core';

const DAY_MS = 86_400_000;

export interface DashboardWindows {
  /** Dia de hoje no fuso do tenant (00:00 -> 00:00 do dia seguinte). */
  todayStart: Date;
  todayEnd: Date;
  /** Mesmo dia da semana passada, do início até o MESMO horário de agora (comparação de ritmo). */
  lastWeekDayStart: Date;
  lastWeekPoint: Date;
  /** Semana corrente (segunda 00:00 do tenant) até agora, e a semana anterior no mesmo ponto. */
  weekStart: Date;
  prevWeekStart: Date;
  prevWeekPoint: Date;
  /** Mês corrente (dia 1 00:00 do tenant) até agora, e o mês anterior no mesmo tempo decorrido. */
  monthStart: Date;
  prevMonthStart: Date;
  prevMonthPoint: Date;
}

/** Dia 1 do mês (offset em meses) como string "YYYY-MM-DD", relativo a `dateStr`. */
function monthFirstStr(dateStr: string, offset: number): string {
  const [y, m] = dateStr.split('-').map(Number);
  const total = y * 12 + (m - 1) + offset; // m é 1-based
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
}

/**
 * As janelas UTC que o dashboard consulta, ancoradas no FUSO DO TENANT. Comparações são "no
 * mesmo ponto" (ritmo): hoje vs mesmo horário da semana passada, semana/mês em curso vs o mesmo
 * tempo decorrido no período anterior - senão comparar um dia pela metade contra um dia inteiro
 * daria sempre negativo de manhã.
 */
export function dashboardWindows(now: Date, tz: string): DashboardWindows {
  const today = isoDateInTz(now, tz);
  const todayStart = localWallTimeToUtc(today, 0, tz);
  const todayEnd = localWallTimeToUtc(addDays(today, 1), 0, tz);

  const dow = weekdayInTz(today, tz); // 0=domingo … 6=sábado
  const monday = addDays(today, -((dow + 6) % 7)); // domingo (0) volta 6, não 1
  const weekStart = localWallTimeToUtc(monday, 0, tz);
  const prevWeekStart = localWallTimeToUtc(addDays(monday, -7), 0, tz);
  const prevWeekPoint = new Date(prevWeekStart.getTime() + (now.getTime() - weekStart.getTime()));

  const lastWeekDayStart = localWallTimeToUtc(addDays(today, -7), 0, tz);
  const lastWeekPoint = new Date(now.getTime() - 7 * DAY_MS); // mesmo horário, 7 dias atrás

  const monthStart = localWallTimeToUtc(monthFirstStr(today, 0), 0, tz);
  const prevMonthStart = localWallTimeToUtc(monthFirstStr(today, -1), 0, tz);
  const prevMonthPoint = new Date(
    prevMonthStart.getTime() + (now.getTime() - monthStart.getTime()),
  );

  return {
    todayStart,
    todayEnd,
    lastWeekDayStart,
    lastWeekPoint,
    weekStart,
    prevWeekStart,
    prevWeekPoint,
    monthStart,
    prevMonthStart,
    prevMonthPoint,
  };
}

// ── Tendência ────────────────────────────────────────────────────────────────

export interface Trend {
  deltaCents: number;
  /** null = sem base de comparação (período anterior zerado) - não inventa %. */
  deltaPct: number | null;
  dir: 'up' | 'down' | 'flat';
}

export function trend(currentCents: number, prevCents: number): Trend {
  const deltaCents = currentCents - prevCents;
  const deltaPct = prevCents > 0 ? Math.round((deltaCents / prevCents) * 100) : null;
  const dir = deltaCents > 0 ? 'up' : deltaCents < 0 ? 'down' : 'flat';
  return { deltaCents, deltaPct, dir };
}

// ── Destaques acionáveis ──────────────────────────────────────────────────────

export interface HighlightInput {
  /** "terça" (já sem "-feira"). */
  weekdayLabel: string;
  todayRevenueCents: number;
  /** Faturamento no mesmo horário da semana passada (ritmo). */
  todayPrevRevenueCents: number;
  upcoming: number;
  noShow: number;
  occupancyPct: number;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Até 2 frases acionáveis, deriva SÓ de número que o motor já deu (nunca inventa dado). Ordem =
 * o que o dono mais quer ouvir de relance: está ganhando > agenda folgada > dia por fechar >
 * faltas. Pode devolver [] (dia parado sem nada a dizer). Fila fica de fora (tem stat própria).
 */
export function pickHighlights(h: HighlightInput): string[] {
  const out: string[] = [];

  if (h.todayPrevRevenueCents > 0 && h.todayRevenueCents >= h.todayPrevRevenueCents) {
    out.push(`Você está à frente da ${h.weekdayLabel} passada no mesmo horário.`);
  }
  if (out.length < 2 && h.upcoming > 0 && h.occupancyPct < 60) {
    out.push(`Agenda ${100 - h.occupancyPct}% livre hoje - ainda dá pra encaixar cliente.`);
  }
  if (out.length < 2 && h.upcoming > 0) {
    out.push(
      `Faltam ${h.upcoming} ${plural(h.upcoming, 'atendimento', 'atendimentos')} pra fechar o dia.`,
    );
  }
  if (out.length < 2 && h.noShow > 0) {
    out.push(
      `${h.noShow} ${plural(h.noShow, 'falta', 'faltas')} hoje - vale confirmar os próximos.`,
    );
  }

  return out.slice(0, 2);
}
