/**
 * Prova a race de double-booking na criação concorrente de agendamento.
 * Sem framework; roda contra o Postgres LOCAL:
 *   cd apps/web && ../bot/node_modules/.bin/tsx --env-file=.env src/lib/appointment-insert.check.mts
 *
 * N confirmações simultâneas do MESMO slot (mesma onda da fila, ou fila vs. fluxo normal)
 * passam todas por insertAppointmentGuarded. Sem a guarda (advisory lock), o findFirst+create
 * não é atômico: todas veem o slot livre e todas criam -> N agendamentos no mesmo horário
 * (regras 3 e 6 violadas). Com a guarda, exatamente 1.
 *
 * Descobre um trio real (tenant/profissional/serviço/contato) do banco de seed; usa um slot
 * no futuro distante e limpa o que criar. Não persiste nada.
 */
import assert from 'node:assert/strict';

import { prisma } from '@haru/database';

import { insertAppointmentGuarded } from './appointment-insert.ts';

const N = 6;
const SLOT_ISO = '2030-01-01T13:00:00.000Z'; // futuro distante: não colide com agenda real

const tenant = await prisma.tenant.findFirst({
  where: { users: { some: {} }, services: { some: { active: true } }, contacts: { some: {} } },
  select: {
    id: true,
    users: { select: { id: true }, take: 1 },
    services: { where: { active: true }, select: { id: true, durationMinutes: true }, take: 1 },
    contacts: { select: { id: true }, take: 1 },
  },
});
assert.ok(
  tenant?.users[0] && tenant.services[0] && tenant.contacts[0],
  'Precisa de um tenant com user + serviço ativo + contato no banco local (rode o seed).',
);

const tenantId = tenant.id;
const professionalId = tenant.users[0]!.id;
const serviceId = tenant.services[0]!.id;
const contactId = tenant.contacts[0]!.id;
const startsAt = new Date(SLOT_ISO);
const endsAt = new Date(startsAt.getTime() + tenant.services[0]!.durationMinutes * 60_000);

// Limpa restos de execuções anteriores neste slot.
await prisma.appointment.deleteMany({ where: { tenantId, professionalId, startsAt } });

// Dispara N criações CONCORRENTES no mesmo slot.
const results = await Promise.all(
  Array.from({ length: N }, () =>
    insertAppointmentGuarded({
      tenantId,
      contactId,
      serviceId,
      professionalId,
      startsAt,
      endsAt,
      status: 'CONFIRMED',
      fromWaitlist: true,
    }),
  ),
);

const created = results.filter((r) => 'appointmentId' in r).length;
const conflicts = results.filter((r) => 'conflict' in r).length;
const inDb = await prisma.appointment.count({ where: { tenantId, professionalId, startsAt } });

console.log(
  `concorrentes=${N} · sucesso(retorno)=${created} · conflito(retorno)=${conflicts} · no banco=${inDb}`,
);

// Limpa o que criou (roda antes do assert pra nunca deixar lixo, mesmo falhando).
await prisma.appointment.deleteMany({ where: { tenantId, professionalId, startsAt } });
await prisma.$disconnect();

assert.equal(inDb, 1, `RACE: ${inDb} agendamentos no MESMO slot (esperado 1) = double-booking.`);
assert.equal(created, 1, `Esperado exatamente 1 sucesso; vieram ${created}.`);
console.log('OK: exatamente 1 agendamento sob concorrência.');
