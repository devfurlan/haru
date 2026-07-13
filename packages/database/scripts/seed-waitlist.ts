// Seed de demonstração da FILA DE ESPERA (só p/ o tenant de teste barbearia-teste).
// Popula: fila lotada de sábado (o insight), um segundo dia, uma oferta ativa (estado
// "ao vivo") e agendamentos recuperados deste mês + do mês passado (métrica + delta).
// Idempotente: limpa o que criou antes de recriar. Rode com:
//   pnpm --filter @haru/database exec dotenv -e .env -- tsx scripts/seed-waitlist.ts

import { prisma } from '../src/index.js';

const SLUG = 'barbearia-teste';
const SEED_PHONE_PREFIX = '55199900'; // marca os contatos de demo p/ limpeza idempotente
const TZ = 'America/Sao_Paulo';

/** "YYYY-MM-DD" de uma data no fuso SP. */
function isoDateSP(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Date de coluna @db.Date (meia-noite UTC) a partir de "YYYY-MM-DD". */
function dbDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Soma dias a um "YYYY-MM-DD". */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Próximo sábado (>= amanhã) a partir de hoje. */
function nextSaturday(todayStr: string): string {
  let cur = todayStr;
  for (let i = 1; i <= 7; i++) {
    cur = addDays(todayStr, i);
    if (new Date(`${cur}T12:00:00Z`).getUTCDay() === 6) return cur;
  }
  return addDays(todayStr, 6);
}

async function main() {
  // Guarda dura: este seed grava métrica de recuperação FALSA (Appointment.fromWaitlist=true)
  // que o painel do dono lê como REAL, além de fila/oferta de demonstração. NUNCA pode tocar
  // produção - só Postgres local. A DATABASE_URL de prod aponta pro Supabase, nunca localhost.
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(dbUrl)) {
    throw new Error(
      '[seed-waitlist] BLOQUEADO: só roda contra Postgres LOCAL (localhost/127.0.0.1). ' +
        'Grava dados de demonstração (fila + recuperação falsas); nunca em produção.',
    );
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG } });
  if (!tenant) throw new Error(`Tenant ${SLUG} não existe. Rode o seed principal antes.`);

  const owner = await prisma.user.findFirst({
    where: { tenantId: tenant.id, isProfessional: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!owner) throw new Error('Nenhum profissional no tenant de teste.');

  const services = await prisma.service.findMany({ where: { tenantId: tenant.id } });
  const svc = (name: string) => services.find((s) => s.name === name) ?? services[0];
  const corte = svc('Corte de cabelo');
  const combo = svc('Corte + barba');
  const barba = svc('Barba');

  // Garante que o profissional exista com nome apresentável no card.
  if (!owner.name) {
    await prisma.user.update({ where: { id: owner.id }, data: { name: 'Téo' } });
  }

  // --- limpeza idempotente (só o que este seed cria) ---------------------------
  await prisma.waitlistOffer.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.waitlistEntry.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.appointment.deleteMany({ where: { tenantId: tenant.id, fromWaitlist: true } });
  await prisma.contact.deleteMany({
    where: { tenantId: tenant.id, phone: { startsWith: SEED_PHONE_PREFIX } },
  });

  const now = new Date();
  const todayStr = isoDateSP(now);
  const saturday = nextSaturday(todayStr);
  const midweek = addDays(todayStr, 3);

  // --- contatos de demo --------------------------------------------------------
  const names = [
    'Marcos Vinícius',
    'Rafael Antunes',
    'Diego Prado',
    'Bruno Salles',
    'Iago Mendes',
    'Caio Ribeiro',
    'Otávio Lima',
    'Henrique Dias',
    'Vitor Camargo',
    'Leandro Rocha',
    'Gustavo Nunes',
    'Pedro Barros',
    'André Fontes',
    'Thiago Mota',
  ];
  const contacts: { id: string; name: string }[] = [];
  for (let i = 0; i < names.length; i++) {
    const phone = `${SEED_PHONE_PREFIX}${String(i).padStart(3, '0')}`;
    const c = await prisma.contact.create({
      data: { tenantId: tenant.id, name: names[i], phone },
      select: { id: true, name: true },
    });
    contacts.push(c);
  }

  // --- fila do sábado (6 pessoas = o insight) ----------------------------------
  const satServices = [combo, corte, combo, barba, corte, combo];
  const satSince = [4, 3, 3, 2, 1, 0]; // dias atrás que entraram (FIFO)
  const satEntryIds: string[] = [];
  for (let i = 0; i < 6; i++) {
    const createdAt = new Date(now.getTime() - satSince[i] * 86_400_000 - (6 - i) * 60_000);
    const e = await prisma.waitlistEntry.create({
      data: {
        tenantId: tenant.id,
        professionalId: owner.id,
        serviceId: satServices[i].id,
        contactId: contacts[i].id,
        date: dbDate(saturday),
        status: 'WAITING',
        createdAt,
      },
      select: { id: true },
    });
    satEntryIds.push(e.id);
  }

  // --- fila do meio de semana (3 pessoas) --------------------------------------
  const midServices = [corte, barba, corte];
  for (let i = 0; i < 3; i++) {
    await prisma.waitlistEntry.create({
      data: {
        tenantId: tenant.id,
        professionalId: owner.id,
        serviceId: midServices[i].id,
        contactId: contacts[6 + i].id,
        date: dbDate(midweek),
        status: 'WAITING',
        createdAt: new Date(now.getTime() - (2 - i) * 86_400_000),
      },
    });
  }

  // --- oferta ativa no sábado (estado "ao vivo": 3 de 6 avisados) ---------------
  await prisma.waitlistOffer.create({
    data: {
      tenantId: tenant.id,
      professionalId: owner.id,
      date: dbDate(saturday),
      wave: 1,
      nextWaveAt: new Date(now.getTime() + 11 * 60_000),
      holdExpiresAt: new Date(now.getTime() + 11 * 60_000),
      notifiedEntryIds: satEntryIds.slice(0, 3),
      status: 'ACTIVE',
    },
  });

  // --- recuperados: este mês (métrica + banner) e mês passado (delta) -----------
  const recoveredServices = [combo, corte, combo, barba, corte, combo, corte, combo, corte];
  let thisMonthCount = 0;
  for (let i = 0; i < recoveredServices.length; i++) {
    const daysAgo = i % 6; // 0..5 dias -> continua no mês (hoje é dia 12)
    const startsAt = new Date(now.getTime() - daysAgo * 86_400_000);
    startsAt.setUTCHours(13, 0, 0, 0);
    const s = recoveredServices[i];
    await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        contactId: contacts[i % contacts.length].id,
        serviceId: s.id,
        professionalId: owner.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + s.durationMinutes * 60_000),
        status: 'CONFIRMED',
        fromWaitlist: true,
        createdAt: new Date(now.getTime() - daysAgo * 86_400_000),
      },
    });
    thisMonthCount++;
  }

  // Mês passado: 6 recuperados (createdAt no dia 15 do mês anterior) p/ o delta.
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  lastMonth.setDate(15);
  lastMonth.setHours(13, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const s = [corte, barba, combo][i % 3];
    await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        contactId: contacts[i % contacts.length].id,
        serviceId: s.id,
        professionalId: owner.id,
        startsAt: new Date(lastMonth.getTime() + i * 3_600_000),
        endsAt: new Date(lastMonth.getTime() + i * 3_600_000 + s.durationMinutes * 60_000),
        status: 'CONFIRMED',
        fromWaitlist: true,
        createdAt: new Date(lastMonth.getTime() + i * 3_600_000),
      },
    });
  }

  console.log('✓ Seed da fila de espera concluído.');
  console.log(`  Sábado ${saturday}: 6 na fila (oferta ativa, 3 avisados)`);
  console.log(`  ${midweek}: 3 na fila`);
  console.log(`  Recuperados este mês: ${thisMonthCount} · mês passado: 6`);
}

main()
  .catch((err) => {
    console.error('[seed-waitlist] falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
