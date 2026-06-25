// Cálculo de horários livres pra agendamento público, no fuso do tenant.
//
// Tudo aqui é puro (sem Prisma/Next): recebe os dados como argumentos e injeta o
// `now`. Isso mantém a lógica de fuso/slot testável e reusável. O caller (server
// action) busca os ScheduleBlock e Appointment do banco e passa pra cá.
//
// A peça delicada é converter "hora-de-parede local no fuso TZ" → instante UTC sem
// libs de data, de forma robusta a horário de verão (DST). O Brasil não usa mais
// DST (desde 2019), mas o algoritmo precisa estar correto pra qualquer fuso.

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const MS_PER_MINUTE = 60_000;

/**
 * Offset do fuso `tz` em minutos para o instante `date`. Positivo a leste de
 * Greenwich, negativo a oeste (ex.: America/Sao_Paulo → -180). Calculado pela
 * diferença entre a hora-de-parede que o fuso mostra nesse instante e o UTC real.
 */
export function tzOffsetMinutes(date: Date, tz: string): number {
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
  // Alguns ambientes emitem "24" pra meia-noite; normaliza pra 0.
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

/**
 * Converte "minuto-local `localMinutes` do dia `dateStr` (YYYY-MM-DD) no fuso `tz`"
 * para o instante UTC correspondente (Date). `localMinutes` é contado desde a
 * meia-noite local; aceita >= 1440 pra representar o início do dia seguinte
 * (ex.: 1440 = 00:00 do dia seguinte, útil pra fechar a janela do dia).
 */
export function localWallTimeToUtc(dateStr: string, localMinutes: number, tz: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const hh = Math.floor(localMinutes / 60);
  const mm = localMinutes % 60;

  // 1ª aproximação: trata a hora-de-parede como se já fosse UTC.
  const guessUtcMs = Date.UTC(y, mo - 1, d, hh, mm, 0);

  // Corrige pelo offset que o fuso aplica por volta desse instante.
  const offset1 = tzOffsetMinutes(new Date(guessUtcMs), tz);
  const correctedMs = guessUtcMs - offset1 * MS_PER_MINUTE;

  // Nas ~1h de virada de DST o offset do instante corrigido pode diferir do palpite.
  // Recalcula uma vez; converge pra qualquer fuso real.
  const offset2 = tzOffsetMinutes(new Date(correctedMs), tz);
  if (offset2 !== offset1) {
    return new Date(guessUtcMs - offset2 * MS_PER_MINUTE);
  }
  return new Date(correctedMs);
}

/**
 * Dia da semana (0 = domingo … 6 = sábado, igual `Date#getDay()`) do dia `dateStr`
 * interpretado no fuso `tz`. Ancora ao meio-dia local pra nunca cair na borda do
 * dia por causa do offset.
 */
export function weekdayInTz(dateStr: string, tz: string): number {
  const noonUtc = localWallTimeToUtc(dateStr, 12 * 60, tz);
  const short = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(
    noonUtc,
  );
  return WEEKDAY_INDEX[short.slice(0, 3)] ?? 0;
}

/** Rótulo "HH:MM" de um instante no fuso `tz`. */
export function formatTimeInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export interface ScheduleBlockLite {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface BusyInterval {
  startsAt: Date;
  endsAt: Date;
}

export interface ComputeSlotsInput {
  tz: string;
  /** Dia-alvo no fuso do tenant, formato YYYY-MM-DD. */
  dateStr: string;
  durationMinutes: number;
  /** Todos os ScheduleBlock do tenant (filtramos pelo weekday aqui dentro). */
  blocks: ScheduleBlockLite[];
  /** Agendamentos ativos que tocam o dia (PENDING/CONFIRMED). */
  appointments: BusyInterval[];
  /** Bloqueios pontuais da agenda (ScheduleException) que tocam o dia. */
  exceptions?: BusyInterval[];
  /** Instante atual injetado - slots no passado são descartados. */
  now: Date;
  /** Passo da grade em minutos (default 30). */
  stepMinutes?: number;
}

export interface AvailableSlot {
  /** Início do slot em UTC (ISO 8601). É o que vai pro Appointment.startsAt. */
  startsAtIso: string;
  /** Rótulo "HH:MM" no fuso do tenant. */
  label: string;
}

const DEFAULT_STEP_MINUTES = 30;

/**
 * Lista os horários livres do dia `dateStr` pra um serviço de `durationMinutes`.
 * Um slot é válido quando [start, start+duration] cabe inteiro dentro de algum
 * ScheduleBlock do weekday e não colide com nenhum agendamento ativo.
 */
export function computeAvailableSlots(input: ComputeSlotsInput): AvailableSlot[] {
  const step = input.stepMinutes ?? DEFAULT_STEP_MINUTES;
  const weekday = weekdayInTz(input.dateStr, input.tz);
  const dayBlocks = input.blocks.filter((b) => b.weekday === weekday);
  if (dayBlocks.length === 0) return []; // fechado nesse dia

  const slots: AvailableSlot[] = [];
  for (const block of dayBlocks) {
    // Primeiro slot alinhado à grade a partir do início do bloco
    // (ex.: bloco começa 08:05, step 30 → primeiro slot 08:30).
    let minute = Math.ceil(block.startMinute / step) * step;
    for (; minute + input.durationMinutes <= block.endMinute; minute += step) {
      const start = localWallTimeToUtc(input.dateStr, minute, input.tz);
      const end = new Date(start.getTime() + input.durationMinutes * MS_PER_MINUTE);

      // Já passou (relevante quando o dia-alvo é hoje).
      if (start <= input.now) continue;

      // Colisão com agendamento ativo - mesma fórmula de overlap do resto do app:
      // existing.startsAt < new.endsAt && existing.endsAt > new.startsAt.
      const collides = input.appointments.some((a) => a.startsAt < end && a.endsAt > start);
      if (collides) continue;

      // Colisão com bloqueio pontual da agenda (mesma fórmula de overlap).
      const blocked = (input.exceptions ?? []).some((e) => e.startsAt < end && e.endsAt > start);
      if (blocked) continue;

      slots.push({ startsAtIso: start.toISOString(), label: formatTimeInTz(start, input.tz) });
    }
  }

  // Blocos podem vir fora de ordem; ordena por instante.
  slots.sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
  return slots;
}

/** Disponibilidade de UM profissional num dia: sua grade + sua agenda + suas folgas. */
export interface ProfessionalAvailabilityInput {
  professionalId: string;
  /** Blocos de expediente do profissional (filtrados pelo weekday aqui dentro). */
  blocks: ScheduleBlockLite[];
  /** Agendamentos ativos DESTE profissional que tocam o dia. */
  appointments: BusyInterval[];
  /** Bloqueios que se aplicam a ele (do tenant inteiro + os pessoais dele). */
  exceptions?: BusyInterval[];
}

export interface ComputeSlotsAcrossInput {
  tz: string;
  dateStr: string;
  durationMinutes: number;
  now: Date;
  stepMinutes?: number;
  professionals: ProfessionalAvailabilityInput[];
}

/** Slot livre considerando vários profissionais; lista quem está livre nele. */
export interface AvailableSlotWithProfessionals extends AvailableSlot {
  /** IDs dos profissionais livres neste horário, na ordem em que vieram na entrada. */
  professionalIds: string[];
}

/**
 * Mescla a disponibilidade de vários profissionais num único dia. Um horário entra
 * na lista se PELO MENOS UM profissional está livre nele; `professionalIds` diz
 * quais (preservando a ordem de entrada - passe os profissionais já ordenados, ex.
 * por nome, para a escolha "sem preferência" ser determinística). Para um único
 * profissional, equivale a `computeAvailableSlots` com o id anexado.
 */
export function computeSlotsAcrossProfessionals(
  input: ComputeSlotsAcrossInput,
): AvailableSlotWithProfessionals[] {
  // startsAtIso -> { label, professionalIds[] }
  const byIso = new Map<string, { label: string; professionalIds: string[] }>();

  for (const prof of input.professionals) {
    const slots = computeAvailableSlots({
      tz: input.tz,
      dateStr: input.dateStr,
      durationMinutes: input.durationMinutes,
      blocks: prof.blocks,
      appointments: prof.appointments,
      exceptions: prof.exceptions,
      now: input.now,
      stepMinutes: input.stepMinutes,
    });
    for (const slot of slots) {
      const entry = byIso.get(slot.startsAtIso) ?? { label: slot.label, professionalIds: [] };
      entry.professionalIds.push(prof.professionalId);
      byIso.set(slot.startsAtIso, entry);
    }
  }

  return [...byIso.entries()]
    .map(([startsAtIso, v]) => ({
      startsAtIso,
      label: v.label,
      professionalIds: v.professionalIds,
    }))
    .sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
}
