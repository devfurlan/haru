// Self-check da hora-alvo do lembrete (parte pura). Roda com:
//   tsx packages/shared/src/reminder-timing.test.ts

import { dueReminderMarks, reminderDueAt } from './reminder-timing';

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

// --- Marcos do lembrete por push (24h / 1h / 30min) ---
const inicio = at('2026-09-02T16:00:00Z');
const marcosEm = (now: Date, armedAt: Date, sent: number[] = []) =>
  dueReminderMarks({ startsAt: inicio, armedAt, now, sent }).map((m) => m.minutes);

const cedo = at('2026-08-30T10:00:00Z'); // marcado com folga

assert(marcosEm(at('2026-09-01T15:59:00Z'), cedo).length === 0, 'antes de 24h: nada');
assert(
  marcosEm(at('2026-09-01T16:00:00Z'), cedo).join() === '1440',
  '24h antes: só o marco de 24h',
);
assert(marcosEm(at('2026-09-02T15:00:00Z'), cedo, [1440]).join() === '60', '1h antes: marco de 1h');
assert(
  marcosEm(at('2026-09-02T15:30:00Z'), cedo, [1440, 60]).join() === '30',
  '30 min antes: marco de 30 min',
);
assert(
  marcosEm(at('2026-09-02T15:45:00Z'), cedo, [1440, 60, 30]).length === 0,
  'marco já enviado não repete',
);
assert(
  dueReminderMarks({ startsAt: inicio, armedAt: cedo, now: at('2026-09-02T15:00:00Z'), sent: [1440] })[0]
    .email === true,
  'o marco de 1h é o que manda e-mail',
);
assert(
  dueReminderMarks({ startsAt: inicio, armedAt: cedo, now: at('2026-09-01T16:00:00Z'), sent: [] })[0]
    .email === false,
  'o marco de 24h não manda e-mail',
);

// Remarcado pra daqui a 3h: o marco de 24h já tinha passado no rearme -> não dispara.
const remarcadoEm = at('2026-09-02T13:00:00Z');
assert(marcosEm(remarcadoEm, remarcadoEm).length === 0, 'remarcação não cospe o marco vencido');
assert(
  marcosEm(at('2026-09-02T15:00:00Z'), remarcadoEm).join() === '60',
  'remarcado: marcos futuros seguem valendo',
);

// Marcado em cima da hora (15 min antes): todos os marcos ficaram pra trás -> um aviso sai.
const emCima = at('2026-09-02T15:45:00Z');
assert(marcosEm(emCima, emCima).join() === '30', 'marcado em cima da hora manda um aviso');
assert(marcosEm(emCima, emCima, [30]).length === 0, 'e esse aviso não repete');

// Downtime: bot volta 40 min antes com nada enviado -> devolve os vencidos de uma vez
// (o caller manda UM push só).
assert(
  marcosEm(at('2026-09-02T15:20:00Z'), cedo).join() === '1440,60',
  'downtime devolve os marcos vencidos juntos',
);

// Atendimento já começou: nada mais sai.
assert(marcosEm(at('2026-09-02T16:30:00Z'), emCima).length === 0, 'depois do início não sai nada');

console.log(`ok - ${passed} asserts`);
