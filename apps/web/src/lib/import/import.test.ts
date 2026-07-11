// Self-check das partes não-triviais da importação. Roda com:
//   dotenv -e ../../.env -- npx tsx apps/web/src/lib/import/import.test.ts
// (o .env é só pra o import do prisma nos specs não reclamar de DATABASE_URL - nenhuma
// query é feita; tudo aqui é lógica pura em memória.)

import { resolveAppointment, type ApptCtx } from './appointments';
import { resolveContact } from './contacts';
import { guessMapping, parseDurationMin, parseImportDate, parsePriceToCents } from './mapping';
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

// ── guessMapping ────────────────────────────────────────────────────────────────
{
  const m = guessMapping(
    ['Nome', 'Telefone', 'E-mail', 'CPF', 'Nascimento'],
    'contacts',
    'generic',
  );
  eq(m.name, 'Nome', 'guess contacts name');
  eq(m.phone, 'Telefone', 'guess contacts phone');
  eq(m.email, 'E-mail', 'guess contacts email');
  eq(m.document, 'CPF', 'guess contacts document');
  eq(m.birthDate, 'Nascimento', 'guess contacts birthDate');
}
{
  const m = guessMapping(
    ['Cliente', 'Serviço', 'Profissional', 'Data', 'Valor'],
    'appointments',
    'appbarber',
  );
  eq(m.customerName, 'Cliente', 'guess appt customerName');
  eq(m.serviceName, 'Serviço', 'guess appt serviceName');
  eq(m.professionalName, 'Profissional', 'guess appt professionalName');
  eq(m.date, 'Data', 'guess appt date');
}
{
  // Match exato do cabeçalho (score 100) ganha do substring: "Tel" == sinônimo 'tel'.
  const m = guessMapping(['Tel', 'Observações'], 'contacts', 'generic');
  eq(m.phone, 'Tel', 'exact header match');
  // Sem match exato, o substring mais longo decide: 'telefone'(8) > 'fone'(4).
  const m2 = guessMapping(['Telefone do Cliente'], 'contacts', 'generic');
  eq(m2.phone, 'Telefone do Cliente', 'longest substring wins');
}

// ── parsePriceToCents ───────────────────────────────────────────────────────────
eq(parsePriceToCents('R$ 1.234,56'), 123456, 'price BR milhar+decimal');
eq(parsePriceToCents('50,00'), 5000, 'price BR decimal');
eq(parsePriceToCents('50.00'), 5000, 'price US decimal');
eq(parsePriceToCents('50'), 5000, 'price inteiro');
eq(parsePriceToCents(''), null, 'price vazio -> null');
eq(parsePriceToCents('grátis'), null, 'price texto -> null');

// ── parseDurationMin ────────────────────────────────────────────────────────────
eq(parseDurationMin('30'), 30, 'dur 30');
eq(parseDurationMin('45 min'), 45, 'dur 45 min');
eq(parseDurationMin('1h'), 60, 'dur 1h');
eq(parseDurationMin('1h30'), 90, 'dur 1h30');
eq(parseDurationMin('01:30'), 90, 'dur 01:30');
eq(parseDurationMin(''), null, 'dur vazio -> null');

// ── parseImportDate ─────────────────────────────────────────────────────────────
eq(
  parseImportDate('25/06/2026 14:30'),
  { dateStr: '2026-06-25', minutes: 870 },
  'date BR + hora junto',
);
eq(
  parseImportDate('25/06/26', '09:00'),
  { dateStr: '2026-06-25', minutes: 540 },
  'date BR aa + hora separada',
);
eq(parseImportDate('2026-06-25'), { dateStr: '2026-06-25', minutes: 0 }, 'date ISO sem hora');
eq(parseImportDate('31/13/2026'), null, 'mês inválido -> null');
eq(parseImportDate('sem data'), null, 'texto -> null');

// ── resolveContact ──────────────────────────────────────────────────────────────
{
  const r = resolveContact(
    { phone: '(11) 91234-5678', name: 'João', email: '', document: '', birthDate: '' },
    new Set(),
  );
  eq(r.disposition, 'create', 'contact novo');
  eq(r.write?.phone, '5511912345678', 'contact phone normalizado E.164');
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
{
  const r = resolveContact(
    { phone: '', name: '', email: '', document: '', birthDate: '' },
    new Set(),
  );
  eq(r.disposition, 'error', 'sem telefone nem nome -> error');
}
{
  const r = resolveContact(
    { phone: '', name: 'Ana', email: '', document: '123', birthDate: '' },
    new Set(),
  );
  eq(r.disposition, 'error', 'CPF inválido -> error');
}

// ── resolveService ──────────────────────────────────────────────────────────────
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
  eq(r2.disposition, 'update', 'serviço nome repetido (case-insensitive) -> update');
}
{
  const r = resolveService(
    { name: 'X', durationMinutes: '999', price: '', description: '' },
    new Set(),
  );
  eq(r.disposition, 'error', 'duração fora do range -> error');
}

// ── resolveAppointment ──────────────────────────────────────────────────────────
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
  eq(r.write?.startsAt.toISOString(), '2026-06-25T17:30:00.000Z', 'appt startsAt local SP -> UTC');
  eq(r.write?.endsAt.toISOString(), '2026-06-25T18:30:00.000Z', 'appt endsAt = start + duração');
  eq(r.write?.professionalId, 'p1', 'appt profissional solo auto-resolvido');
  eq(r.write?.contactId, 'c1', 'appt contato por telefone');
  eq(r.write?.status, 'COMPLETED', 'appt passado sem status -> COMPLETED');
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
    apptCtx({ proIds: ['p1', 'p2'] }),
  );
  eq(r.disposition, 'error', 'vários profissionais sem coluna -> error');
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
  eq(r.disposition, 'skip', 'appt já existente -> skip (idempotência)');
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
  eq(r.write?.status, 'CONFIRMED', 'appt futuro sem status -> CONFIRMED');
}

console.log(`\n${passed} checks passed${process.exitCode ? ' (com falhas acima)' : ''}`);
