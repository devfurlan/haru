// Geração de datas de uma série de agendamentos recorrentes, no fuso do tenant.
//
// Puro e sem dependências de Next/Prisma - recebe tudo por argumento. A peça
// delicada é manter a HORA-DE-PAREDE local constante ao saltar de semana/mês,
// reconvertendo pra UTC de forma robusta a DST (mesmo algoritmo de availability.ts).
//
// IMPORTANTE: este arquivo é DUPLICADO em apps/bot/src/lib/recurrence.ts (mesmo
// padrão de format.ts). Ao alterar um, alterar o outro.

export type RecurrenceFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

/** Nenhuma ocorrência da série pode cair além deste horizonte (a partir de hoje). */
export const RECURRENCE_MAX_HORIZON_DAYS = 90;

/** Quantidades de repetições oferecidas na UI (inclui a 1ª ocorrência). */
export const RECURRENCE_OCCURRENCE_OPTIONS = [2, 3, 4, 6, 8, 12] as const;

const MS_PER_MINUTE = 60_000;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Offset do fuso `tz` em minutos para o instante `date` (positivo a leste). */
function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - date.getTime()) / MS_PER_MINUTE);
}

/** Converte "minuto-local `localMinutes` do dia `dateStr` no fuso `tz`" → instante UTC. */
function localWallTimeToUtc(dateStr: string, localMinutes: number, tz: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const hh = Math.floor(localMinutes / 60);
  const mm = localMinutes % 60;
  const guessUtcMs = Date.UTC(y, mo - 1, d, hh, mm, 0);
  const offset1 = tzOffsetMinutes(new Date(guessUtcMs), tz);
  const correctedMs = guessUtcMs - offset1 * MS_PER_MINUTE;
  const offset2 = tzOffsetMinutes(new Date(correctedMs), tz);
  if (offset2 !== offset1) {
    return new Date(guessUtcMs - offset2 * MS_PER_MINUTE);
  }
  return new Date(correctedMs);
}

interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  /** Minutos desde a meia-noite local (hh*60 + mm). */
  minutes: number;
}

/** Componentes da hora-de-parede local de `date` no fuso `tz`. */
function getLocalParts(date: Date, tz: string): LocalParts {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    minutes: hour * 60 + get('minute'),
  };
}

/** Weekday (0=domingo … 6=sábado) e minuto-do-dia local de um instante no fuso `tz`. */
function localWeekdayAndMinutes(date: Date, tz: string): { weekday: number; minutes: number } {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  const { minutes } = getLocalParts(date, tz);
  return { weekday: WEEKDAY_INDEX[short.slice(0, 3)] ?? 0, minutes };
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const pad4 = (n: number) => String(n).padStart(4, '0');

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/**
 * Gera os instantes UTC (ISO 8601) das `count` ocorrências de uma série que começa
 * em `firstStartsAtIso`. A primeira ocorrência é exatamente o slot escolhido; as
 * demais saltam mantendo a hora-de-parede local:
 *   WEEKLY   +7 dias · BIWEEKLY +14 dias · MONTHLY +1 mês (clamp ao último dia do mês).
 */
export function generateSeriesDates(
  firstStartsAtIso: string,
  tz: string,
  frequency: RecurrenceFrequency,
  count: number,
): string[] {
  const first = new Date(firstStartsAtIso);
  if (Number.isNaN(first.getTime()) || count < 1) return [];

  const { year, month, day, minutes } = getLocalParts(first, tz);
  const result: string[] = [first.toISOString()];

  for (let i = 1; i < count; i++) {
    let dateStr: string;
    if (frequency === 'MONTHLY') {
      const total = year * 12 + (month - 1) + i;
      const y = Math.floor(total / 12);
      const mo = (total % 12) + 1;
      const d = Math.min(day, daysInMonth(y, mo));
      dateStr = `${pad4(y)}-${pad2(mo)}-${pad2(d)}`;
    } else {
      const stepDays = frequency === 'WEEKLY' ? 7 : 14;
      // Soma dias à data civil via UTC (lida com viradas de mês/ano); âncora ao
      // meio-dia evita cair no dia errado por offset.
      const civil = new Date(Date.UTC(year, month - 1, day + stepDays * i, 12));
      dateStr = `${pad4(civil.getUTCFullYear())}-${pad2(civil.getUTCMonth() + 1)}-${pad2(civil.getUTCDate())}`;
    }
    result.push(localWallTimeToUtc(dateStr, minutes, tz).toISOString());
  }
  return result;
}

export interface OpenBlock {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

/**
 * Verifica se a ocorrência `[startsAt, startsAt+durationMinutes]` cabe inteira dentro
 * de algum ScheduleBlock do seu weekday (no fuso `tz`). Não checa conflito com outros
 * agendamentos - isso fica a cargo do caller (query Prisma de overlap).
 */
export function occursWithinOpenBlocks(
  startsAtIso: string,
  durationMinutes: number,
  tz: string,
  blocks: OpenBlock[],
): boolean {
  const { weekday, minutes } = localWeekdayAndMinutes(new Date(startsAtIso), tz);
  const end = minutes + durationMinutes;
  return blocks.some(
    (b) => b.weekday === weekday && minutes >= b.startMinute && end <= b.endMinute,
  );
}
