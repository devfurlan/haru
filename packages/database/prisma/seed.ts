import { createClient } from '@supabase/supabase-js';

import { prisma } from '../src/index.js';

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
  const supabase = createClient(
    required('SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Lista paginada (em dev nunca temos muitos users — primeira página resolve)
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

  await prisma.user.upsert({
    where: { authId },
    update: { tenantId: tenant.id, email: TEST_EMAIL },
    create: {
      authId,
      email: TEST_EMAIL,
      name: 'Admin Teste',
      role: 'OWNER',
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

  console.log('[seed] recriando horários (seg-sex 9-12 + 13-18, sáb 9-13)...');
  await prisma.scheduleBlock.deleteMany({ where: { tenantId: tenant.id } });
  const blocks: Array<{
    tenantId: string;
    weekday: number;
    startMinute: number;
    endMinute: number;
  }> = [];
  for (let weekday = 1; weekday <= 5; weekday++) {
    blocks.push({ tenantId: tenant.id, weekday, startMinute: 9 * 60, endMinute: 12 * 60 });
    blocks.push({ tenantId: tenant.id, weekday, startMinute: 13 * 60, endMinute: 18 * 60 });
  }
  blocks.push({ tenantId: tenant.id, weekday: 6, startMinute: 9 * 60, endMinute: 13 * 60 });
  await prisma.scheduleBlock.createMany({ data: blocks });

  console.log('');
  console.log('✓ Seed concluído.');
  console.log(`  Estabelecimento: ${TEST_BUSINESS} (slug: ${TEST_SLUG})`);
  console.log(`  Login: ${TEST_EMAIL}`);
  console.log(`  Senha: ${TEST_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('[seed] falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
