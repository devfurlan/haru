// Self-check da lógica pura (ponytail: uma checagem runnable). Roda com `pnpm --filter
// @haru/shared check`. Falha se o cálculo de slots ou a colisão quebrarem.
import assert from 'node:assert';

import {
  computeAvailableSlots,
  weekdayInTz,
  formatPhoneBR,
  normalizePhoneBR,
  matchesSearch,
  normalizeForSearch,
  googleCalendarUrl,
  buildIcs,
} from './src/index';

const tz = 'America/Sao_Paulo';
const dateStr = '2026-07-15';
const weekday = weekdayInTz(dateStr, tz);
const block = { weekday, startMinute: 540, endMinute: 720 }; // 09:00-12:00
const now = new Date('2000-01-01T00:00:00Z'); // bem no passado: nada é descartado

// Slots de serviço de 60min num bloco de 09:00-12:00, agenda vazia.
const free = computeAvailableSlots({
  tz,
  dateStr,
  durationMinutes: 60,
  blocks: [block],
  appointments: [],
  now,
});
assert.deepStrictEqual(
  free.map((s) => s.label),
  ['09:00', '09:30', '10:00', '10:30', '11:00'],
  'slots livres esperados',
);

// Um agendamento 10:00-11:00 deve remover 09:30, 10:00 e 10:30 (overlap), sobrando 09:00 e 11:00.
const startsAt = new Date(free.find((s) => s.label === '10:00')!.startsAtIso);
const withBusy = computeAvailableSlots({
  tz,
  dateStr,
  durationMinutes: 60,
  blocks: [block],
  appointments: [{ startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000) }],
  now,
});
assert.deepStrictEqual(
  withBusy.map((s) => s.label),
  ['09:00', '11:00'],
  'colisão de agendamento deve podar os slots sobrepostos',
);

// Formatação de telefone BR ida-e-volta.
assert.strictEqual(formatPhoneBR('5511914092346'), '(11) 91409-2346');
assert.strictEqual(normalizePhoneBR('(11) 91409-2346'), '5511914092346');

// Busca textual: normalização e casamento por token (nome + slug).
assert.strictEqual(normalizeForSearch('São João'), 'sao joao');
assert.strictEqual(normalizeForSearch('STLima-Barber'), 'stlima barber');
// o caso reportado: "st lima" acha o slug "stlima-barber" (nome com ou sem espaço)
assert.ok(matchesSearch('st lima', 'STLima Barber', 'stlima-barber'));
assert.ok(matchesSearch('st lima', 'STLima', 'stlima-barber'));
assert.ok(matchesSearch('lima st', 'ST Lima', 'st-lima')); // ordem livre
assert.ok(matchesSearch('joão', 'Salao Sao Joao')); // acento no termo, só nome
assert.ok(!matchesSearch('xyz', 'STLima Barber', 'stlima-barber')); // não bate
assert.ok(!matchesSearch('💈', 'Qualquer', 'qualquer')); // lixo não casa tudo
assert.ok(!matchesSearch('a e', 'Salao Sao Joao', 'salao-sj')); // tokens de 1 char são ruído

// "Adicionar à agenda": Google URL + .ics de um evento de 30min. Confere o intervalo
// UTC (18:00->18:30) e que o .ics tem o VEVENT com DTSTART/DTEND e SUMMARY escapado.
const ev = {
  title: 'Corte masculino · Barbearia do Téo',
  startIso: '2026-07-15T18:00:00.000Z',
  minutes: 30,
  location: 'Rua Aurora, 210; Centro',
};
const gurl = googleCalendarUrl(ev);
assert.ok(gurl.includes('dates=20260715T180000Z/20260715T183000Z'), 'google dates UTC');
assert.ok(gurl.includes('text=Corte%20masculino'), 'google title encodado');
const ics = buildIcs({ ...ev, uid: 'appt-123@demandae' });
assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'), 'ics abre VCALENDAR com CRLF');
assert.ok(ics.includes('DTSTART:20260715T180000Z'), 'ics DTSTART');
assert.ok(ics.includes('DTEND:20260715T183000Z'), 'ics DTEND');
assert.ok(ics.includes('UID:appt-123@demandae'), 'ics UID estável');
assert.ok(ics.includes('LOCATION:Rua Aurora\\, 210\\; Centro'), 'ics escapa vírgula/;');
assert.ok(ics.trim().endsWith('END:VCALENDAR'), 'ics fecha VCALENDAR');

console.log('shared self-check OK');
