import { createClient } from '@supabase/supabase-js';

import { prisma } from '../src/index.js';
import { seedAddonPlans, seedPlans } from './plans.js';

const TEST_EMAIL = 'admin@teste.local';
const TEST_PASSWORD = 'haru1234';
const TEST_BUSINESS = 'Barbearia Teste';
const TEST_SLUG = 'barbearia-teste';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

async function ensureAuthUser(): Promise<string> {
  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SECRET_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Lista paginada (em dev nunca temos muitos users - primeira página resolve)
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === TEST_EMAIL);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error('Failed to create auth user');
  return data.user.id;
}

async function main() {
  console.log('[seed] populando catálogo de planos + addon...');
  await seedPlans(prisma);
  await seedAddonPlans(prisma);

  console.log('[seed] criando auth user...');
  const authId = await ensureAuthUser();

  console.log('[seed] upsertando tenant + user...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST_SLUG },
    update: { name: TEST_BUSINESS },
    create: {
      name: TEST_BUSINESS,
      slug: TEST_SLUG,
      timezone: 'America/Sao_Paulo',
    },
  });

  // OWNER nasce profissional (caso solo): tem agenda própria e recebe agendamentos.
  const owner = await prisma.user.upsert({
    where: { authId },
    update: { tenantId: tenant.id, email: TEST_EMAIL, isProfessional: true },
    create: {
      authId,
      email: TEST_EMAIL,
      name: 'Admin Teste',
      role: 'OWNER',
      isProfessional: true,
      tenantId: tenant.id,
    },
  });

  console.log('[seed] recriando serviços...');
  await prisma.service.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.service.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: 'Corte de cabelo',
        description: 'Corte tradicional na máquina ou tesoura',
        durationMinutes: 30,
        priceCents: 5000,
      },
      {
        tenantId: tenant.id,
        name: 'Barba',
        description: null,
        durationMinutes: 20,
        priceCents: 3500,
      },
      {
        tenantId: tenant.id,
        name: 'Corte + barba',
        description: 'Combo completo',
        durationMinutes: 50,
        priceCents: 7500,
      },
      {
        tenantId: tenant.id,
        name: 'Sobrancelha',
        description: null,
        durationMinutes: 15,
        priceCents: 2000,
      },
    ],
  });

  // Vincula o profissional (owner) a todos os serviços - sem isso o booking não
  // resolve quem atende e não oferece horários.
  console.log('[seed] vinculando profissional aos serviços...');
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id },
    select: { id: true },
  });
  await prisma.professionalService.deleteMany({ where: { professionalId: owner.id } });
  await prisma.professionalService.createMany({
    data: services.map((s) => ({ professionalId: owner.id, serviceId: s.id })),
  });

  console.log('[seed] recriando horários (seg-sex 9-12 + 13-18, sáb 9-13)...');
  await prisma.scheduleBlock.deleteMany({ where: { tenantId: tenant.id } });
  const blocks: Array<{
    tenantId: string;
    professionalId: string;
    weekday: number;
    startMinute: number;
    endMinute: number;
  }> = [];
  for (let weekday = 1; weekday <= 5; weekday++) {
    blocks.push({
      tenantId: tenant.id,
      professionalId: owner.id,
      weekday,
      startMinute: 9 * 60,
      endMinute: 12 * 60,
    });
    blocks.push({
      tenantId: tenant.id,
      professionalId: owner.id,
      weekday,
      startMinute: 13 * 60,
      endMinute: 18 * 60,
    });
  }
  blocks.push({
    tenantId: tenant.id,
    professionalId: owner.id,
    weekday: 6,
    startMinute: 9 * 60,
    endMinute: 13 * 60,
  });
  await prisma.scheduleBlock.createMany({ data: blocks });

  console.log('[seed] criando estabelecimentos da região (CEP 13458883)...');
  await seedRegionTenants();

  console.log('');
  console.log('✓ Seed concluído.');
  console.log(`  Estabelecimento: ${TEST_BUSINESS} (slug: ${TEST_SLUG})`);
  console.log(`  Login: ${TEST_EMAIL}`);
  console.log(`  Senha: ${TEST_PASSWORD}`);
}

// Estabelecimentos fake ancorados em Santa Bárbara d'Oeste/SP (CEP 13458883,
// ~-22.754,-47.414) pra testar a busca por proximidade do app. Cada um nasce
// bookável: profissional (sem login) + serviços + horário padrão.
async function seedRegionTenants() {
  const CENTER = { lat: -22.7539, lng: -47.4139 };
  const establishments = [
    {
      name: 'Barbearia Dom Corte',
      slug: 'barbearia-dom-corte',
      address: "Rua do Bosque, 120 - Vila Mollon, Santa Bárbara d'Oeste - SP",
      dLat: 0.004,
      dLng: 0.003,
      services: [
        ['Corte de cabelo', 30, 4500],
        ['Barba', 20, 3000],
      ],
    },
    {
      name: 'Studio Bella Hair',
      slug: 'studio-bella-hair',
      address: "Av. Santa Bárbara, 850 - Centro, Santa Bárbara d'Oeste - SP",
      dLat: -0.006,
      dLng: 0.008,
      services: [
        ['Escova', 40, 6000],
        ['Corte feminino', 50, 8000],
        ['Coloração', 90, 15000],
      ],
    },
    {
      name: 'Esmalteria Nails & Co',
      slug: 'esmalteria-nails-co',
      address: "Rua Riachuelo, 45 - Centro, Santa Bárbara d'Oeste - SP",
      dLat: 0.009,
      dLng: -0.005,
      services: [
        ['Manicure', 40, 4000],
        ['Pedicure', 45, 4500],
      ],
    },
    {
      name: 'Espaço Zen Massoterapia',
      slug: 'espaco-zen-massoterapia',
      address: "Rua Duque de Caxias, 300 - Jardim Europa, Santa Bárbara d'Oeste - SP",
      dLat: -0.011,
      dLng: -0.007,
      services: [
        ['Massagem relaxante', 60, 12000],
        ['Massagem terapêutica', 60, 14000],
      ],
    },
    {
      name: 'Clínica Sorriso Odonto',
      slug: 'clinica-sorriso-odonto',
      address: "Av. de Cillo, 1500 - Centro, Santa Bárbara d'Oeste - SP",
      dLat: 0.013,
      dLng: 0.012,
      services: [
        ['Limpeza', 40, 12000],
        ['Avaliação', 30, 0],
      ],
    },
    {
      name: 'Pet Shop Amigo Fiel',
      slug: 'pet-shop-amigo-fiel',
      address: "Rua Tamoio, 78 - Jardim Pérola, Santa Bárbara d'Oeste - SP",
      dLat: -0.015,
      dLng: 0.006,
      services: [
        ['Banho', 45, 5000],
        ['Banho e tosa', 90, 9000],
      ],
    },
    {
      name: 'Studio Nova Sobrancelha',
      slug: 'studio-nova-sobrancelha',
      address: "Av. Monte Castelo, 2200 - Jardim Mollon, Santa Bárbara d'Oeste - SP",
      dLat: 0.007,
      dLng: -0.014,
      services: [
        ['Design de sobrancelha', 30, 3500],
        ['Henna', 40, 5000],
      ],
    },
  ] as const;

  for (const e of establishments) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: e.slug },
      update: {
        name: e.name,
        address: e.address,
        latitude: CENTER.lat + e.dLat,
        longitude: CENTER.lng + e.dLng,
        publicBookingEnabled: true,
      },
      create: {
        name: e.name,
        slug: e.slug,
        timezone: 'America/Sao_Paulo',
        address: e.address,
        latitude: CENTER.lat + e.dLat,
        longitude: CENTER.lng + e.dLng,
        publicBookingEnabled: true,
      },
    });

    // Profissional sem login (authId sintético, único). Recebe agendamentos mas
    // não acessa o painel.
    const pro = await prisma.user.upsert({
      where: { authId: `seed-pro-${e.slug}` },
      update: { tenantId: tenant.id, isProfessional: true },
      create: {
        authId: `seed-pro-${e.slug}`,
        email: `pro+${e.slug}@teste.local`,
        name: e.name,
        role: 'OWNER',
        isProfessional: true,
        tenantId: tenant.id,
      },
    });

    await prisma.service.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.service.createMany({
      data: e.services.map(([name, durationMinutes, priceCents]) => ({
        tenantId: tenant.id,
        name,
        durationMinutes,
        priceCents,
      })),
    });

    const services = await prisma.service.findMany({
      where: { tenantId: tenant.id },
      select: { id: true },
    });
    await prisma.professionalService.deleteMany({ where: { professionalId: pro.id } });
    await prisma.professionalService.createMany({
      data: services.map((s) => ({ professionalId: pro.id, serviceId: s.id })),
    });

    // Seg-sex 9-12 + 13-18, sáb 9-13 (mesmo padrão do tenant principal).
    await prisma.scheduleBlock.deleteMany({ where: { tenantId: tenant.id } });
    const blocks = [];
    for (let weekday = 1; weekday <= 5; weekday++) {
      blocks.push({
        tenantId: tenant.id,
        professionalId: pro.id,
        weekday,
        startMinute: 9 * 60,
        endMinute: 12 * 60,
      });
      blocks.push({
        tenantId: tenant.id,
        professionalId: pro.id,
        weekday,
        startMinute: 13 * 60,
        endMinute: 18 * 60,
      });
    }
    blocks.push({
      tenantId: tenant.id,
      professionalId: pro.id,
      weekday: 6,
      startMinute: 9 * 60,
      endMinute: 13 * 60,
    });
    await prisma.scheduleBlock.createMany({ data: blocks });
  }

  console.log(`  ${establishments.length} estabelecimentos criados perto de -22.754,-47.414`);
}

main()
  .catch((err) => {
    console.error('[seed] falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
