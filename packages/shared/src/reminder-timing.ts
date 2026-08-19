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
 * Re-arma TODOS os canais do lembrete. Use em toda remarcação: o horário mudou, logo o
 * lembrete já enviado vale pro horário velho. Existe como constante única porque os dois
 * caminhos de remarcação (web e bot) esqueciam canais DIFERENTES - o web não zerava o
 * e-mail, o bot não zerava o push.
 */
export const REMINDER_STAMPS_RESET = {
  reminderSentAt: null,
  reminderEmailSentAt: null,
  reminderPushSentAt: null,
} as const;
