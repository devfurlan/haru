// Self-check da engine de retorno (parte pura). Roda com:
//   tsx apps/web/src/lib/comms/return-reminder-core.test.ts

import {
  returnCandidates,
  returnReminderCopy,
  type ReturnApptInput,
  type ReturnParams,
} from './return-reminder-core';

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else passed++;
}

const DAY = 86_400_000;
const now = new Date('2026-07-16T12:00:00.000Z');
const P: ReturnParams = { leadDays: 3, lapseDays: 60, tz: 'UTC' };
// visita `daysAgo` dias atrás (day-number = -daysAgo). daysUntil = cycleDays - daysAgo.
const v = (serviceId: string, daysAgo: number, priceCents = 5000): ReturnApptInput => ({
  serviceId,
  startsAt: new Date(now.getTime() - daysAgo * DAY),
  status: 'COMPLETED',
  priceCents,
});
const noCfg = new Map<string, number | null>();

// Mediana robusta a outlier + janela: gaps [90,30,30] -> mediana 30 (não a média 50).
// last = 30d atrás, ciclo 30 -> daysUntil 0 -> elegível.
{
  const c = returnCandidates(
    [v('corte', 180), v('corte', 90), v('corte', 60), v('corte', 30)],
    noCfg,
    now,
    P,
  );
  assert(c.length === 1, 'mediana: 1 candidato');
  assert(c[0]?.cycleDays === 30, `mediana=30 (outlier ignorado), veio ${c[0]?.cycleDays}`);
  assert(c[0]?.source === 'median', 'source=median');
  assert(c[0]?.daysUntil === 0, `daysUntil=0, veio ${c[0]?.daysUntil}`);
}

// Colapso do mesmo dia: 2 visitas em 60d atrás não injetam gap 0. gaps colapsados [30] -> 30
// (sem colapso seriam [0,30] -> mediana 15).
{
  const c = returnCandidates([v('barba', 30), v('barba', 60), v('barba', 60)], noCfg, now, P);
  assert(c[0]?.cycleDays === 30, `colapso mesmo-dia: ciclo=30 (não 15), veio ${c[0]?.cycleDays}`);
}

// Fallback pra config quando só há 1 visita (sem mediana possível).
{
  const cfg = new Map<string, number | null>([['corte', 30]]);
  const c = returnCandidates([v('corte', 28)], cfg, now, P);
  assert(c.length === 1 && c[0]?.source === 'config', 'fallback config com 1 visita');
  assert(c[0]?.cycleDays === 30 && c[0]?.daysUntil === 2, 'config: ciclo 30, daysUntil 2');
}

// Sem histórico E sem config -> não cutuca.
assert(
  returnCandidates([v('corte', 28)], noCfg, now, P).length === 0,
  '1 visita sem config -> vazio',
);

// returnCycleDays=0/negativo = não-setado -> não cutuca.
{
  const cfg = new Map<string, number | null>([['corte', 0]]);
  assert(
    returnCandidates([v('corte', 28)], cfg, now, P).length === 0,
    'returnCycleDays=0 ignorado',
  );
}

// Cerca do win-back: última visita há 65d (>=60) -> vira "sumido", engine de retorno pula.
{
  const c = returnCandidates([v('corte', 125), v('corte', 95), v('corte', 65)], noCfg, now, P);
  assert(c.length === 0, 'goneDays>=60 -> turf do win-back, vazio');
}

// Janela: daysUntil > leadDays (cedo demais) desliga; na borda (==leadDays) liga.
{
  const cfg = new Map<string, number | null>([['corte', 30]]);
  assert(returnCandidates([v('corte', 10)], cfg, now, P).length === 0, 'daysUntil 20 -> cedo, off');
  assert(
    returnCandidates([v('corte', 27)], cfg, now, P)[0]?.daysUntil === 3,
    'borda daysUntil=3 -> on',
  );
  assert(returnCandidates([v('corte', 26)], cfg, now, P).length === 0, 'daysUntil 4 -> off');
}

// Copy: com horários lista os slots no email; sem horários vira genérica.
{
  const base = {
    name: 'Bia',
    tenantName: 'Studio X',
    serviceName: 'corte',
    professionalName: 'Léo',
    link: 'https://x/y',
    unsubscribeUrl: 'https://x/unsub',
    pushData: { type: 'return_reminder' },
    whatsappTemplate: 'return_reminder',
  };
  const withSlots = returnReminderCopy({ ...base, slots: ['Qui 15h', 'Sex 10h'] });
  assert(withSlots.email!.body.includes('Qui 15h'), 'copy com slots lista horários');
  assert(withSlots.whatsapp!.params.length === 3, 'whatsapp 3 params (nome, serviço, link)');
  const noSlots = returnReminderCopy({ ...base, slots: [] });
  assert(!noSlots.email!.body.includes('Qui 15h'), 'copy sem slots é genérica');
}

console.log(`ok - ${passed} asserts`);
