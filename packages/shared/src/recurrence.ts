// Tipos de fio (wire) da PRÉVIA de uma série recorrente, compartilhados entre web e
// mobile. A geração das datas e a checagem de disponibilidade são server-only (Prisma) -
// aqui ficam só os formatos que o cliente recebe pra montar a prévia editável.

/** Frequências de recorrência oferecidas ao cliente (espelha o enum do banco). */
export type RecurrenceFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

/** Quantidades de repetições oferecidas na UI (inclui a 1ª ocorrência). */
export const RECURRENCE_OCCURRENCE_OPTIONS = [2, 3, 4, 6, 8, 12] as const;

/**
 * Até quantos dias adiante uma série pode ir (a partir de hoje). Espelha o
 * RECURRENCE_MAX_HORIZON_DAYS do servidor (apps/web|bot/src/lib/recurrence.ts) - os
 * clientes usam este valor pro calendário/carrossel da troca de dia de uma ocorrência,
 * que vai além do horizonte de agendamento avulso (BOOKING_HORIZON_DAYS). Manter em sincronia.
 */
export const RECURRENCE_MAX_HORIZON_DAYS = 90;

/**
 * Situação de uma ocorrência gerada, mantendo o mesmo dia-da-semana e horário do
 * primeiro agendamento:
 *  'free'   - horário livre; entra na série.
 *  'taken'  - dentro do expediente, mas ocupado (dá pra trocar por outro horário do dia).
 *  'closed' - fora do expediente daquele profissional nesse dia (dá pra trocar).
 *  'past'   - caiu no passado (série muito curta em relação a hoje); descartada.
 *  'beyond' - além do horizonte de recorrência (90 dias); descartada.
 */
export type SeriesOccurrenceStatus = 'free' | 'taken' | 'closed' | 'past' | 'beyond';

export interface SeriesOccurrencePreview {
  /** Instante UTC (ISO) da ocorrência no mesmo dia-da-semana/horário do 1º agendamento. */
  targetIso: string;
  status: SeriesOccurrenceStatus;
  /** Horários livres nesse dia (pro "trocar horário"). Vazio em 'past'/'beyond'. */
  slots: { startsAtIso: string; label: string }[];
}

export interface SeriesPreview {
  /** Profissional resolvido do 1º slot - a série inteira é dele. O cliente usa esse id
   * pra buscar horários DELE ao trocar o dia de uma ocorrência (senão a troca cairia
   * num profissional diferente e o servidor rejeitaria na criação). */
  professionalId: string;
  occurrences: SeriesOccurrencePreview[];
}
