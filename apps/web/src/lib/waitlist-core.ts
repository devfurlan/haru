// Lógica pura da fila de espera (sem DB, sem server-only) - importável pelo self-check
// (waitlist.check.mts) sob `node`. A parte que toca o banco/envio vive em waitlist.ts.

/** Tamanho da onda (spec: 3 por vez). Fixo - a config do dono é só janela + modo. */
export const WAVE_SIZE = 3;
/** Limites (minutos) da janela de confirmação ajustável pelo dono. Fonte única: UI + server. */
export const WINDOW_MIN_MINUTES = 5;
export const WINDOW_MAX_MINUTES = 60;

/** "YYYY-MM-DD" (dia-calendário local do tenant) -> Date de coluna `@db.Date` (meia-noite UTC). */
export function dbDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Date de coluna `@db.Date` -> "YYYY-MM-DD". */
export function dateStrOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "sábado, 11/07" - rótulo do dia no fuso do tenant. Meio-dia UTC evita virar o dia. */
export function dayLabel(dateStr: string, tz: string): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(d);
}

/**
 * Próxima onda a notificar: os primeiros `waveSize` da fila (ordenada) que ainda não foram
 * notificados neste episódio - ou todos, no modo "todos de uma vez". Serve tanto pra onda 1
 * (notifiedIds vazio) quanto pro avanço (notifiedIds = já avisados).
 */
export function nextWave<T extends { id: string }>(
  waiting: T[],
  notifiedIds: string[],
  waveSize: number,
  allAtOnce: boolean,
): T[] {
  const notified = new Set(notifiedIds);
  const remaining = waiting.filter((e) => !notified.has(e.id));
  return allAtOnce ? remaining : remaining.slice(0, waveSize);
}

/**
 * Motivo estruturado da inelegibilidade - o front decide o estado a partir DAQUI, não do
 * texto de `reason` (que é só p/ exibir). `notWorking`/`expedienteOver` = "dia fechado".
 */
export type EligibilityCode =
  | 'disabled'
  | 'invalidInput'
  | 'past'
  | 'beyondHorizon'
  | 'notWorking'
  | 'expedienteOver'
  | 'hasFreeSlot';

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: string; code: EligibilityCode };

/**
 * Combina as condições de entrada na fila (todas checadas server-side). Elegível só quando
 * o dia está LOTADO pro profissional (sem horário livre), o expediente ainda NÃO acabou, e
 * está dentro da janela de agendamento. Ordem = primeira falha vira a mensagem.
 */
export function evaluateEligibility(input: {
  waitlistEnabled: boolean;
  past: boolean;
  beyondHorizon: boolean;
  worksThatDay: boolean;
  expedienteOver: boolean;
  hasFreeSlot: boolean;
}): EligibilityResult {
  if (!input.waitlistEnabled)
    return { eligible: false, code: 'disabled', reason: 'Fila de espera indisponível' };
  if (input.past) return { eligible: false, code: 'past', reason: 'Esse dia já passou' };
  if (input.beyondHorizon)
    return { eligible: false, code: 'beyondHorizon', reason: 'Esse dia está fora do período de agendamento' };
  if (!input.worksThatDay)
    return { eligible: false, code: 'notWorking', reason: 'O profissional não atende nesse dia' };
  if (input.expedienteOver)
    return { eligible: false, code: 'expedienteOver', reason: 'O expediente desse dia já encerrou' };
  if (input.hasFreeSlot)
    return { eligible: false, code: 'hasFreeSlot', reason: 'Ainda há horário livre - dá pra agendar direto' };
  return { eligible: true };
}
