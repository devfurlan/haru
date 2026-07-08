// Status "aberto agora / aberto até X" de um estabelecimento, a partir da grade de
// expediente (ScheduleBlock) e do fuso do tenant. Função pura (sem DB) pra ser testável
// e reusável no diretório e na página do estabelecimento. NÃO considera ScheduleException
// (folgas pontuais) - é status de vitrine, não motor de disponibilidade de slots.
import { weekdayOf } from '@haru/shared';

export interface OpenBlock {
  /** 0 = domingo, 6 = sábado (igual Date#getDay()). */
  weekday: number;
  /** Minutos desde a meia-noite. */
  startMinute: number;
  endMinute: number;
}

export interface OpenStatus {
  open: boolean;
  /** "20h" / "20h30" quando aberto agora; null quando fechado. */
  untilLabel: string | null;
}

// Minuto do dia (0..1439) de um instante lido no fuso `tz`.
function minutesOfDayInTz(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

// "20h" / "20h30" (padrão BR do produto, igual aos horários do resto da UI).
function hourLabel(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Está aberto AGORA? Abre se qualquer bloco (de qualquer profissional) do weekday atual
 * contém o minuto atual. `untilLabel` = o fim mais tardio entre os blocos que cobrem agora.
 */
export function openStatus(blocks: OpenBlock[], tz: string, now: Date = new Date()): OpenStatus {
  const wd = weekdayOf(now, tz);
  const mins = minutesOfDayInTz(now, tz);
  let until = -1;
  for (const b of blocks) {
    if (b.weekday === wd && mins >= b.startMinute && mins < b.endMinute && b.endMinute > until) {
      until = b.endMinute;
    }
  }
  return until >= 0
    ? { open: true, untilLabel: hourLabel(until) }
    : { open: false, untilLabel: null };
}
