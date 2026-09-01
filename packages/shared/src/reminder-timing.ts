// Quando o lembrete do agendamento DEVE sair - PARTE PURA (zero IO), pra o loop do bot
// não decidir isso no meio da query.
//
// Regra base: hora-alvo = startsAt - reminderMinutesBefore.
// O caso que quebrava: agendamento ARMADO depois da hora-alvo. Ex.: tenant que lembra
// 24h antes e o cliente marca hoje de manhã pra hoje à tarde - o alvo (ontem) já passou,
// então o "lembrete" saía no mesmo minuto da confirmação, carimbava os canais como
// enviados e o cliente NÃO recebia nada perto da hora. Nesse caso o alvo é reprogramado
// pra `lateLeadMinutes` antes do atendimento, que é o que "lembrete" quer dizer.
//
// "Armado" é a criação OU a REMARCAÇÃO: remarcar zera os carimbos (REMINDER_STAMPS_RESET)
// e o lembrete passa a valer pro horário novo. Usar a criação aqui repetia o mesmo bug uma
// camada acima - remarcar pra daqui a 3h num tenant que lembra 24h antes disparava o
// lembrete no ato da remarcação (o alvo de 24h já tinha passado) e o cliente não recebia
// nada perto da hora.
//
// O alvo normal (alvo >= criação) NÃO é mexido: se ele já passou porque o bot ficou fora
// do ar, o retorno dispara o lembrete atrasado - comportamento que se quer manter.

/** Antecedência usada quando o agendamento nasceu depois da hora-alvo. */
export const LATE_BOOKING_LEAD_MINUTES = 30;

/**
 * Hora-alvo EFETIVA do lembrete. Marcado em cima da hora (menos que a antecedência
 * mínima), o alvo cai no passado de propósito: dispara no próximo tick e pronto.
 */
export function reminderDueAt(input: {
  startsAt: Date;
  /** Quando o lembrete foi armado: criação ou última remarcação (Appointment.updatedAt). */
  armedAt: Date;
  minutesBefore: number;
  lateLeadMinutes?: number;
}): Date {
  const { startsAt, armedAt, minutesBefore } = input;
  const lateLead = Math.min(minutesBefore, input.lateLeadMinutes ?? LATE_BOOKING_LEAD_MINUTES);
  const target = new Date(startsAt.getTime() - minutesBefore * 60_000);
  if (armedAt <= target) return target;
  return new Date(startsAt.getTime() - lateLead * 60_000);
}

/**
 * Marcos do lembrete por PUSH: minutos antes do atendimento + se aquele marco também
 * manda E-MAIL. Um único aviso 24h antes é cedo demais pra ser útil (o cliente esquece
 * de novo), então o push - grátis e silencioso perto do WhatsApp - repete em 24h, 1h e
 * 30 min, e o e-mail sai UMA vez, no marco de 1h. O WhatsApp NÃO entra aqui: continua no
 * marco que o dono configura (Tenant.reminderMinutesBefore), porque é o canal com quota.
 * Ordem decrescente - o último item é o marco mais perto do atendimento.
 */
export const REMINDER_MARKS = [
  { minutes: 1440, email: false },
  { minutes: 60, email: true },
  { minutes: 30, email: false },
] as const;

export type ReminderMark = (typeof REMINDER_MARKS)[number];

/** Marco mais perto do atendimento - o que encerra o ciclo de lembretes do appt. */
export const LAST_REMINDER_MARK = REMINDER_MARKS[REMINDER_MARKS.length - 1].minutes;

/**
 * Marcos VENCIDOS que ainda não saíram (`sent` = minutos já enviados, Appointment.
 * reminderPushMarks).
 *
 * `armedAt` descarta os marcos que já tinham passado quando o lembrete foi armado: marcar
 * (ou remarcar) pra daqui a 3h não pode cuspir os avisos de 24h e 1h de uma vez - mesma
 * regra do reminderDueAt. Se TODOS passaram no armamento e nada saiu ainda, devolve o
 * último marco: marcou em cima da hora, mas ao menos um aviso tem que sair.
 *
 * Pode devolver mais de um marco quando o loop ficou parado (downtime): o caller manda UM
 * push só e consome todos, pra a volta do bot não virar rajada de notificação.
 */
export function dueReminderMarks(input: {
  startsAt: Date;
  armedAt: Date;
  now: Date;
  sent: readonly number[];
}): ReminderMark[] {
  const { startsAt, armedAt, now, sent } = input;
  const at = (minutes: number) => new Date(startsAt.getTime() - minutes * 60_000);

  const due = REMINDER_MARKS.filter(
    (mk) => !sent.includes(mk.minutes) && at(mk.minutes) >= armedAt && at(mk.minutes) <= now,
  );
  if (due.length > 0) return [...due];

  if (sent.length === 0 && armedAt > at(LAST_REMINDER_MARK) && now < startsAt) {
    return [REMINDER_MARKS[REMINDER_MARKS.length - 1]];
  }
  return [];
}

/**
 * Re-arma TODOS os canais do lembrete. Use em toda remarcação: o horário mudou, logo o
 * lembrete já enviado vale pro horário velho. Existe como constante única porque os dois
 * caminhos de remarcação (web e bot) esqueciam canais DIFERENTES - o web não zerava o
 * e-mail, o bot não zerava o push.
 */
export const REMINDER_STAMPS_RESET = {
  reminderSentAt: null,
  reminderEmailSentAt: null,
  reminderPushSentAt: null,
  /** Marcos já enviados - zerados junto, senão o horário novo herda o ciclo do antigo.
   * `as number[]`: sem isso o `as const` deixa o array readonly e o Prisma recusa no update. */
  reminderPushMarks: [] as number[],
} as const;
