// Geração dos dias oferecidos no agendamento online, no fuso do tenant.
//
// Puro e sem dependências de Next/Prisma — usado tanto no servidor (page.tsx, pra
// decidir se há algum dia atendível e gerar a lista inicial) quanto no client
// (carrossel de chips e date-picker). A regra de ouro: TODA conta de data sai do
// fuso do TENANT via Intl, NUNCA do browser do cliente.

/** Até quantos dias adiante (a partir de hoje) o agendamento online é oferecido. */
export const BOOKING_HORIZON_DAYS = 60;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const WD_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface BookingDay {
  /** "YYYY-MM-DD" no fuso do tenant. */
  value: string;
  /** Ex.: "sáb., 30/05". */
  label: string;
}

/** Weekday (0=domingo … 6=sábado) de um instante lido no fuso `tz`. */
export function weekdayOf(date: Date, tz: string): number {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  return WD_SHORT[short.slice(0, 3)] ?? 0;
}

/** "YYYY-MM-DD" de um instante lido no fuso `tz` (en-CA já entrega ISO). */
export function isoDateInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Rótulo "sáb., 30/05" de um instante lido no fuso `tz`. */
export function labelDateInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

/**
 * Rótulo "sáb., 30/05" a partir de uma data civil "YYYY-MM-DD". Ancora ao meio-dia
 * UTC pra nunca cair no dia errado por causa do offset do fuso (Brasil é -03:00, e
 * 12:00 UTC é 09:00 local — bem longe das bordas da meia-noite). Pra um dia escolhido
 * no date-picker, o weekday/dia/mês não dependem do fuso, então isso é exato.
 */
export function labelFromIso(dateStr: string, tz: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return labelDateInTz(new Date(Date.UTC(y, mo - 1, d, 12)), tz);
}

/**
 * Próximos dias (a partir de hoje, no fuso `tz`) que têm ao menos um ScheduleBlock
 * no weekday, rotulados "sáb., 30/05". `openWeekdays` é o conjunto de dias-da-semana
 * com expediente (0..6). Limitado a `horizonDays` dias adiante.
 */
export function buildBookingDays(
  tz: string,
  openWeekdays: Set<number>,
  horizonDays: number = BOOKING_HORIZON_DAYS,
): BookingDay[] {
  if (openWeekdays.size === 0) return [];
  const now = Date.now();
  const days: BookingDay[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const date = new Date(now + i * MS_PER_DAY);
    if (!openWeekdays.has(weekdayOf(date, tz))) continue;
    days.push({ value: isoDateInTz(date, tz), label: labelDateInTz(date, tz) });
  }
  return days;
}
