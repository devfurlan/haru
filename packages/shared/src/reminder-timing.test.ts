// Self-check da hora-alvo do lembrete (parte pura). Roda com:
//   tsx packages/shared/src/reminder-timing.test.ts

import { reminderDueAt } from './reminder-timing';

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else passed++;
}

const MIN = 60_000;
const at = (iso: string) => new Date(iso);

// Caso normal: marcou com folga, tenant lembra 30 min antes -> alvo = startsAt - 30min.
assert(
  reminderDueAt({
    startsAt: at('2026-07-30T18:00:00Z'),
    armedAt: at('2026-07-28T10:00:00Z'),
    minutesBefore: 30,
  }).getTime() === at('2026-07-30T17:30:00Z').getTime(),
  'alvo normal = startsAt - antecedência',
);

// O BUG: tenant lembra 24h antes e o cliente marca no MESMO dia. O alvo (ontem) já
// passou na criação - o lembrete NÃO pode sair no ato, tem que ir pra 30 min antes.
const late = reminderDueAt({
  startsAt: at('2026-07-30T18:00:00Z'),
  armedAt: at('2026-07-30T08:00:00Z'),
  minutesBefore: 1440,
});
assert(
  late.getTime() === at('2026-07-30T17:30:00Z').getTime(),
  'criado após o alvo -> 30 min antes',
);
assert(late > at('2026-07-30T08:00:00Z'), 'não dispara no ato do agendamento');

// Downtime do bot: o alvo passou DEPOIS da criação -> alvo intocado (dispara atrasado).
assert(
  reminderDueAt({
    startsAt: at('2026-07-30T18:00:00Z'),
    armedAt: at('2026-07-29T09:00:00Z'),
    minutesBefore: 1440,
  }).getTime() === at('2026-07-29T18:00:00Z').getTime(),
  'alvo pós-criação segue valendo (recuperação de downtime)',
);

// Antecedência menor que a de atraso: usa a do tenant, não estica pra 30 min.
assert(
  reminderDueAt({
    startsAt: at('2026-07-30T18:00:00Z'),
    armedAt: at('2026-07-30T17:50:00Z'),
    minutesBefore: 10,
  }).getTime() === at('2026-07-30T17:50:00Z').getTime(),
  'lateLead nunca passa da antecedência do tenant',
);

// Marcou em cima da hora (menos que a antecedência mínima): alvo no passado = próximo tick.
const now = at('2026-07-30T17:45:00Z');
assert(
  reminderDueAt({ startsAt: at('2026-07-30T18:00:00Z'), armedAt: now, minutesBefore: 1440 }) <
    now,
  'marcado em cima da hora dispara no próximo tick',
);

// REMARCAÇÃO pra daqui a pouco: os carimbos são zerados e o relógio re-armado (updatedAt).
// Com a criação antiga o alvo de 24h "já vencido" fazia o lembrete sair no ato da remarcação
// e o cliente não recebia nada perto da hora - o caso do agendamento remarcado 18/08.
const remarcado = reminderDueAt({
  startsAt: at('2026-08-18T17:30:00Z'),
  armedAt: at('2026-08-17T21:55:00Z'), // remarcado ontem à noite, appt criado semanas antes
  minutesBefore: 1440,
});
assert(
  remarcado.getTime() === at('2026-08-18T17:00:00Z').getTime(),
  'remarcado após o alvo -> 30 min antes do novo horário',
);
assert(remarcado > at('2026-08-17T21:55:00Z'), 'não dispara no ato da remarcação');

// Fronteira: criado EXATAMENTE na hora-alvo conta como normal (não reprograma).
assert(
  reminderDueAt({
    startsAt: at('2026-07-30T18:00:00Z'),
    armedAt: new Date(at('2026-07-30T18:00:00Z').getTime() - 60 * MIN),
    minutesBefore: 60,
  }).getTime() === at('2026-07-30T17:00:00Z').getTime(),
  'criado no instante do alvo = alvo normal',
);

console.log(`ok - ${passed} asserts`);
