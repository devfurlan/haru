// Self-check das partes puras da importação. Roda com DATABASE_URL no ambiente (os specs
// importam prisma, mas nenhuma query roda aqui):
//   set -a; source packages/database/.env; set +a; tsx apps/web/src/lib/import/import.test.ts

import { resolveAppointment, type ApptCtx } from './appointments';
import { resolveContact } from './contacts';
import {
  detectEntity,
  guessMapping,
  parseDurationMin,
  parseImportDate,
  parsePriceToCents,
} from './mapping';
import { resolveService } from './services';

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else passed++;
}
function eq(a: unknown, b: unknown, msg: string) {
  assert(
    JSON.stringify(a) === JSON.stringify(b),
    `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`,
  );
}

// ── guessMapping ──
{
  const m = guessMapping(['Nome', 'Telefone', 'E-mail', 'CPF', 'Nascimento'], 'contacts');
  eq(m.name, 'Nome', 'guess contacts name');
  eq(m.phone, 'Telefone', 'guess contacts phone');
  eq(m.birthDate, 'Nascimento', 'guess contacts birthDate');
}
{
  const m = guessMapping(['Data', 'Hora', 'Cliente', 'Serviço', 'Profissional'], 'appointments');
  eq(m.date, 'Data', 'guess appt date');
  eq(m.time, 'Hora', 'guess appt time');
  eq(m.customerName, 'Cliente', 'guess appt customer');
  eq(m.serviceName, 'Serviço', 'guess appt service');
  eq(m.professionalName, 'Profissional', 'guess appt professional');
}

// ── detectEntity ──
eq(detectEntity(['Serviço', 'Duração (min)', 'Valor']), 'services', 'detect services');
eq(detectEntity(['Nome', 'Celular', 'E-mail', 'Aniversário']), 'contacts', 'detect contacts');
eq(
  detectEntity(['Data', 'Hora', 'Cliente', 'Serviço', 'Profissional']),
  'appointments',
  'detect appointments',
);
eq(detectEntity(['Data', 'Cliente', 'Serviço', 'Valor pago']), 'history', 'detect history');

// ── parsers ──
eq(parsePriceToCents('R$ 1.234,56'), 123456, 'price BR milhar+decimal');
eq(parsePriceToCents('50,00'), 5000, 'price BR decimal');
eq(parsePriceToCents('50.00'), 5000, 'price US decimal');
eq(parseDurationMin('1h30'), 90, 'dur 1h30');
eq(parseDurationMin('01:30'), 90, 'dur 01:30');
eq(parseImportDate('25/06/2026 14:30'), { dateStr: '2026-06-25', minutes: 870 }, 'date BR + hora');
eq(parseImportDate('31/13/2026'), null, 'mês inválido -> null');

// ── resolveContact ──
{
  const r = resolveContact(
    { phone: '(11) 91234-5678', name: 'João', email: '', document: '', birthDate: '' },
    new Set(),
  );
  eq(r.disposition, 'create', 'contact novo');
  eq(r.write?.phone, '5511912345678', 'contact phone E.164');
}
{
  const r = resolveContact(
    { phone: '11912345678', name: '', email: '', document: '', birthDate: '' },
    new Set(['5511912345678']),
  );
  eq(r.disposition, 'update', 'contact existente -> update');
}
{
  const r = resolveContact(
    { phone: '123', name: '', email: '', document: '', birthDate: '' },
    new Set(),
  );
  eq(r.disposition, 'error', 'telefone inválido -> error');
}

// ── resolveService ──
{
  const seen = new Set<string>();
  const r = resolveService(
    { name: 'Corte', durationMinutes: '30', price: 'R$ 40,00', description: '' },
    seen,
  );
  eq(r.disposition, 'create', 'serviço novo');
  eq(r.write?.priceCents, 4000, 'serviço priceCents');
  const r2 = resolveService(
    { name: 'corte', durationMinutes: '30', price: '', description: '' },
    seen,
  );
  eq(r2.disposition, 'update', 'serviço repetido -> update');
}

// ── resolveAppointment ──
function apptCtx(over: Partial<ApptCtx> = {}): ApptCtx {
  return {
    servicesByName: new Map([['corte', { id: 'svc1', durationMinutes: 60 }]]),
    contactsByPhone: new Map([['5511912345678', 'c1']]),
    contactsByName: new Map(),
    prosByName: new Map(),
    proIds: ['p1'],
    tz: 'America/Sao_Paulo',
    now: Date.parse('2026-07-01T00:00:00Z'),
    existingKeys: new Set(),
    seen: new Set(),
    mode: 'future',
    ...over,
  };
}
{
  const r = resolveAppointment(
    {
      serviceName: 'Corte',
      professionalName: '',
      customerPhone: '11912345678',
      customerName: 'João',
      date: '25/06/2026',
      time: '14:30',
      status: '',
    },
    apptCtx(),
  );
  eq(r.disposition, 'create', 'appt happy path');
  eq(r.write?.startsAt.toISOString(), '2026-06-25T17:30:00.000Z', 'appt SP -> UTC');
  eq(r.write?.endsAt.toISOString(), '2026-06-25T18:30:00.000Z', 'appt endsAt');
  eq(r.write?.status, 'COMPLETED', 'appt passado -> COMPLETED');
}
{
  const r = resolveAppointment(
    {
      serviceName: 'Corte',
      professionalName: '',
      customerPhone: '11912345678',
      customerName: '',
      date: '10/12/2026',
      time: '10:00',
      status: '',
    },
    apptCtx(),
  );
  eq(r.write?.status, 'CONFIRMED', 'appt futuro -> CONFIRMED');
}
{
  const r = resolveAppointment(
    {
      serviceName: 'Corte',
      professionalName: '',
      customerPhone: '11912345678',
      customerName: '',
      date: '25/06/2026',
      time: '14:30',
      status: '',
    },
    apptCtx({ mode: 'history' }),
  );
  eq(r.write?.status, 'COMPLETED', 'history sempre COMPLETED');
}
{
  const r = resolveAppointment(
    {
      serviceName: 'Barba',
      professionalName: '',
      customerPhone: '11912345678',
      customerName: '',
      date: '25/06/2026',
      time: '14:30',
      status: '',
    },
    apptCtx(),
  );
  eq(r.disposition, 'error', 'serviço inexistente -> error');
}
{
  const ctx = apptCtx({ existingKeys: new Set(['c1|svc1|2026-06-25T17:30:00.000Z']) });
  const r = resolveAppointment(
    {
      serviceName: 'Corte',
      professionalName: '',
      customerPhone: '11912345678',
      customerName: '',
      date: '25/06/2026',
      time: '14:30',
      status: '',
    },
    ctx,
  );
  eq(r.disposition, 'skip', 'appt já existente -> skip');
}

console.log(`\n${passed} checks passed${process.exitCode ? ' (com falhas acima)' : ''}`);
