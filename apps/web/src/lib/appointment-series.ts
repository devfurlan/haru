// Criação de uma série de agendamentos recorrentes (semanal/quinzenal/mensal).
//
// Server-only (usa Prisma) - chamado pelas server actions do painel e do booking
// público. A primeira ocorrência já vem validada pelo caller (slot livre, alinhado à
// grade, no expediente); aqui geramos as demais e validamos CADA uma de forma
// independente, PULANDO (sem travar a série) as que:
//   - caem além do horizonte de RECURRENCE_MAX_HORIZON_DAYS dias,
//   - ficam fora do expediente do tenant (ScheduleBlock daquele weekday), ou
//   - colidem com outro agendamento ativo (mesma fórmula de overlap do resto do app).

import { prisma, type AppointmentStatus, type RecurrenceFrequency } from '@haru/database';

import {
  generateSeriesDates,
  occursWithinOpenBlocks,
  RECURRENCE_MAX_HORIZON_DAYS,
  type OpenBlock,
} from './recurrence';

const MS_PER_DAY = 86_400_000;

export interface CreateAppointmentSeriesInput {
  tenantId: string;
  contactId: string;
  serviceId: string;
  durationMinutes: number;
  tz: string;
  frequency: RecurrenceFrequency;
  /** Total de ocorrências desejadas, incluindo a primeira. */
  occurrences: number;
  /** Slot da primeira ocorrência (ISO UTC), já validado pelo caller. */
  firstStartsAtIso: string;
  /**
   * Datas explícitas da série (ISO UTC), quando o cliente montou a prévia editável
   * (trocou/removeu ocorrências). Ausente = gera automaticamente a partir do 1º slot
   * (caminho do painel). Cada ISO é RE-validado aqui - não se confia no cliente.
   */
  occurrenceIsos?: string[];
  /** Status com que cada ocorrência entra (CONFIRMED no painel; config do tenant no público). */
  status: AppointmentStatus;
  /** Profissional fixo da série inteira (mesma pessoa em todas as ocorrências). */
  professionalId: string;
  /** ScheduleBlocks DO PROFISSIONAL, pra validar expediente de cada ocorrência. */
  blocks: OpenBlock[];
}

export interface CreateAppointmentSeriesResult {
  seriesId: string | null;
  /** IDs dos agendamentos efetivamente criados (em ordem cronológica). */
  createdIds: string[];
  /** ISOs (UTC) das ocorrências puladas por conflito/expediente. */
  skipped: string[];
  /** Quantas ocorrências foram descartadas por passar do horizonte de 90 dias. */
  beyondHorizon: number;
}

/**
 * Gera e cria as ocorrências da série. Não dispara notificações/templates - isso
 * fica a cargo do caller (que decide a política de notificação por superfície).
 */
export async function createAppointmentSeries(
  input: CreateAppointmentSeriesInput,
): Promise<CreateAppointmentSeriesResult> {
  const now = new Date();
  const maxInstant = new Date(now.getTime() + RECURRENCE_MAX_HORIZON_DAYS * MS_PER_DAY);

  // Prévia editável manda as datas prontas (já sem as removidas); o painel deixa gerar.
  const dates =
    input.occurrenceIsos && input.occurrenceIsos.length > 0
      ? [...new Set(input.occurrenceIsos)].sort() // ISO ordena cronologicamente
      : generateSeriesDates(input.firstStartsAtIso, input.tz, input.frequency, input.occurrences);

  // Bloqueios pontuais da agenda - uma ocorrência que cai num bloqueio é pulada,
  // como já se faz com colisão e expediente. Busca uma vez só (N de ocorrências
  // é pequeno; a janela cobre toda a série).
  const exceptions = await prisma.scheduleException.findMany({
    where: {
      tenantId: input.tenantId,
      endsAt: { gt: now },
      // Folgas do tenant inteiro + as do profissional da série.
      OR: [{ professionalId: null }, { professionalId: input.professionalId }],
    },
    select: { startsAt: true, endsAt: true },
  });

  const toCreate: { startsAt: Date; endsAt: Date }[] = [];
  const skipped: string[] = [];
  let beyondHorizon = 0;

  for (const iso of dates) {
    const startsAt = new Date(iso);
    if (startsAt > maxInstant) {
      beyondHorizon++;
      continue;
    }
    if (startsAt <= now) {
      skipped.push(iso);
      continue;
    }
    if (!occursWithinOpenBlocks(iso, input.durationMinutes, input.tz, input.blocks)) {
      skipped.push(iso);
      continue;
    }
    const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);
    const blocked = exceptions.some((e) => e.startsAt < endsAt && e.endsAt > startsAt);
    if (blocked) {
      skipped.push(iso);
      continue;
    }
    const conflict = await prisma.appointment.findFirst({
      where: {
        tenantId: input.tenantId,
        professionalId: input.professionalId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
      },
      select: { id: true },
    });
    if (conflict) {
      skipped.push(iso);
      continue;
    }
    // Colisão DENTRO do próprio lote: com a prévia editável o cliente pode mandar duas
    // ocorrências no mesmo dia em horários que se sobrepõem (serviço > passo da grade).
    // A checagem no banco (acima) não pega isso porque nenhuma das duas foi criada ainda.
    const overlapsBatch = toCreate.some((t) => t.startsAt < endsAt && t.endsAt > startsAt);
    if (overlapsBatch) {
      skipped.push(iso);
      continue;
    }
    toCreate.push({ startsAt, endsAt });
  }

  if (toCreate.length === 0) {
    return { seriesId: null, createdIds: [], skipped, beyondHorizon };
  }

  // Cria a série + as ocorrências numa transação. Loop de `create` (em vez de
  // `createMany`) pra obter os IDs - N é pequeno (≤ algumas dezenas).
  const { seriesId, createdIds } = await prisma.$transaction(async (tx) => {
    const series = await tx.appointmentSeries.create({
      data: { tenantId: input.tenantId, frequency: input.frequency },
    });
    const ids: string[] = [];
    for (const { startsAt, endsAt } of toCreate) {
      const appt = await tx.appointment.create({
        data: {
          tenantId: input.tenantId,
          contactId: input.contactId,
          serviceId: input.serviceId,
          professionalId: input.professionalId,
          startsAt,
          endsAt,
          status: input.status,
          seriesId: series.id,
        },
        select: { id: true },
      });
      ids.push(appt.id);
    }
    return { seriesId: series.id, createdIds: ids };
  });

  return { seriesId, createdIds, skipped, beyondHorizon };
}
