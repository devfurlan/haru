import { prisma } from '@haru/database';

// Slugs reservados - não podem colidir com rotas conhecidas em apps/web.
// Mantido em sincronia com RESERVED_SLUGS de (dashboard)/settings/actions.ts
// (validação na criação do slug).
const RESERVED_SLUGS = new Set([
  'robots',
  'robots.txt',
  'sitemap',
  'sitemap.xml',
  'login',
  'signup',
  'dashboard',
  'appointments',
  'conversations',
  'schedule',
  'services',
  'settings',
  'blog',
  'api',
  'admin',
]);

const FILE_LIKE_SLUG = /\.[a-z0-9]+$/i;

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug) || FILE_LIKE_SLUG.test(slug);
}

/**
 * Carrega o tenant público por slug com serviços ativos + blocos de horário.
 * Retorna null pra slugs reservados/file-like (a page renderiza notFound()).
 * Compartilhado entre a page (`page.tsx`) e as server actions (`actions.ts`).
 */
export async function loadPublicTenant(slug: string) {
  if (isReservedSlug(slug)) return null;
  return prisma.tenant.findUnique({
    where: { slug },
    include: {
      services: {
        where: { active: true },
        orderBy: { name: 'asc' },
        include: { professionals: { select: { professionalId: true } } },
      },
      scheduleBlocks: { orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] },
      // Profissionais (com agenda) para o passo "escolha o profissional" no booking.
      users: {
        where: { isProfessional: true },
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, name: true },
      },
    },
  });
}

export type PublicTenant = NonNullable<Awaited<ReturnType<typeof loadPublicTenant>>>;
