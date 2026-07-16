import { prisma } from '@haru/database';
import { isReservedSlug } from '@haru/shared';

export { isReservedSlug };

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
      // Assinatura: pra derivar o flag efetivo da fila (feature Time+) sem query extra.
      subscription: true,
      // Planos do Clube (ativos) pra vitrine de assinatura na página do estabelecimento.
      membershipPlans: {
        where: { active: true },
        orderBy: { priceCents: 'asc' },
        include: { services: { select: { serviceId: true } } },
      },
      // Profissionais (com agenda) para o passo "escolha o profissional" no booking.
      users: {
        where: { isProfessional: true },
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });
}

export type PublicTenant = NonNullable<Awaited<ReturnType<typeof loadPublicTenant>>>;
