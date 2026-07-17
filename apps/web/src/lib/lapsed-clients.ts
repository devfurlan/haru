/**
 * "Clientes sumidos" (win-back): quem era cliente de casa e parou de voltar.
 *
 * Um contato é "sumido" quando (1) já veio ao menos MIN_VISITS vezes (era de casa),
 * (2) não tem nenhum agendamento futuro e (3) a última visita foi há >= `lapseDays`.
 *
 * `monthlyCents` estima quanto o cliente rendia por mês NO RITMO em que vinha:
 * receita histórica / dias entre a 1ª e a última visita * 30. O span é pisado em
 * SPAN_FLOOR_DAYS pra dois-visitas-coladas não extrapolarem um valor absurdo.
 * A soma disso entre todos os sumidos é o "dinheiro parado na mesa / mês".
 */

const DAY_MS = 86_400_000;
const MIN_VISITS = 2;
const SPAN_FLOOR_DAYS = 30;

export type ApptStatus = 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'NO_SHOW';

export interface LapsedAppointmentInput {
  startsAt: Date;
  status: ApptStatus;
  service: { name: string; priceCents: number };
}

export interface LapsedContactInput {
  id: string;
  name: string | null;
  phone: string | null;
  appointments: LapsedAppointmentInput[];
}

export interface LapsedRow {
  id: string;
  name: string | null;
  phone: string | null;
  favService: string | null;
  visits: number;
  cadenceDays: number; // intervalo médio entre visitas
  goneDays: number; // dias desde a última visita
  lastVisit: Date;
  monthlyCents: number; // receita histórica normalizada por 30 dias
}

export interface LapsedResult {
  rows: LapsedRow[]; // TODOS os sumidos, ordenados por monthlyCents desc
  count: number;
  totalMonthlyCents: number;
}

// Uma "visita" = agendamento passado que de fato aconteceu (não cancelado, não faltou).
// Estrutural de propósito (só startsAt+status): reusado pelo lembrete de retorno, que
// tem outro shape de appointment (ver lib/comms/return-reminder-core.ts).
export function isVisit(a: { startsAt: Date; status: ApptStatus }, nowMs: number): boolean {
  return a.startsAt.getTime() < nowMs && a.status !== 'CANCELED' && a.status !== 'NO_SHOW';
}

export function computeLapsed(
  contacts: LapsedContactInput[],
  now: Date,
  lapseDays: number,
): LapsedResult {
  const nowMs = now.getTime();
  const rows: LapsedRow[] = [];

  for (const c of contacts) {
    const visits = c.appointments
      .filter((a) => isVisit(a, nowMs))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    if (visits.length < MIN_VISITS) continue;

    // Tem agendamento futuro (marcado, não cancelado)? Então não sumiu.
    const hasFuture = c.appointments.some(
      (a) => a.startsAt.getTime() >= nowMs && a.status !== 'CANCELED',
    );
    if (hasFuture) continue;

    const last = visits[visits.length - 1].startsAt;
    const goneDays = Math.floor((nowMs - last.getTime()) / DAY_MS);
    if (goneDays < lapseDays) continue;

    const first = visits[0].startsAt;
    const rawSpanDays = (last.getTime() - first.getTime()) / DAY_MS;
    const spanDays = Math.max(SPAN_FLOOR_DAYS, rawSpanDays);
    const revenueCents = visits.reduce((s, v) => s + v.service.priceCents, 0);
    const monthlyCents = Math.round((revenueCents / spanDays) * 30);
    const cadenceDays = Math.max(1, Math.round(rawSpanDays / (visits.length - 1)));

    // Serviço de sempre: o mais frequente entre as visitas.
    const freq = new Map<string, number>();
    for (const v of visits) freq.set(v.service.name, (freq.get(v.service.name) ?? 0) + 1);
    let favService: string | null = null;
    let favN = 0;
    for (const [name, n] of freq) if (n > favN) ((favService = name), (favN = n));

    rows.push({
      id: c.id,
      name: c.name,
      phone: c.phone,
      favService,
      visits: visits.length,
      cadenceDays,
      goneDays,
      lastVisit: last,
      monthlyCents,
    });
  }

  rows.sort((a, b) => b.monthlyCents - a.monthlyCents);
  return {
    rows,
    count: rows.length,
    totalMonthlyCents: rows.reduce((s, r) => s + r.monthlyCents, 0),
  };
}
