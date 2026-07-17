import { prisma } from '@haru/database';
import { formatBRL } from '@haru/shared';

import { requireUserAndTenant } from '@/lib/auth';
import { isRealized, revenueOf } from '@/lib/metrics/metrics-core';
import { dataScope, panelRole } from '@/lib/permissions';

import { ClientsList, type ClientRow } from './clients-list';

export default async function ClientsPage() {
  const user = await requireUserAndTenant();
  const { tenant } = user;
  const role = panelRole(user);
  // Profissional vê só os clientes que ELE atendeu (e o histórico dele com eles); dono/apoio
  // veem todos. Receita por cliente é dinheiro -> só o dono.
  const ownProId = dataScope(role) === 'own' ? user.id : undefined;
  const showRevenue = role === 'OWNER';
  const now = Date.now();

  const contacts = await prisma.contact.findMany({
    where: {
      tenantId: tenant.id,
      ...(ownProId ? { appointments: { some: { professionalId: ownProId } } } : {}),
    },
    orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    take: 300,
    include: {
      appointments: {
        where: ownProId ? { professionalId: ownProId } : undefined,
        select: {
          startsAt: true,
          endsAt: true,
          status: true,
          service: { select: { name: true, priceCents: true } },
        },
        orderBy: { startsAt: 'desc' },
      },
    },
  });

  const dateFmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tenant.timezone,
    day: '2-digit',
    month: '2-digit',
  });

  const nowDate = new Date(now);
  const rows: ClientRow[] = contacts.map((c) => {
    const active = c.appointments.filter((a) => a.status !== 'CANCELED');
    const count = active.length;
    // Receita realizada (isRealized, regra canônica do motor) - SÓ pro dono; a equipe não vê
    // dinheiro, então nem calcula.
    const totalCents = showRevenue
      ? c.appointments
          .filter((a) => isRealized(a, nowDate))
          .reduce((s, a) => s + revenueOf({ priceCents: a.service.priceCents }), 0)
      : 0;

    // Última visita: agendamento passado mais recente (lista já vem desc por startsAt).
    const lastPast = c.appointments.find(
      (a) => a.startsAt.getTime() < now && a.status !== 'CANCELED',
    );

    // Serviço de sempre: mais frequente entre os não-cancelados.
    const freq = new Map<string, number>();
    for (const a of active) freq.set(a.service.name, (freq.get(a.service.name) ?? 0) + 1);
    let fav: string | null = null;
    let favN = 0;
    for (const [name, n] of freq) if (n > favN) ((fav = name), (favN = n));

    const tag = count >= 5 ? 'Recorrente' : count <= 1 ? 'Novo' : null;

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      count,
      lastVisitLabel: lastPast ? dateFmt.format(lastPast.startsAt) : null,
      lastVisitTs: lastPast ? lastPast.startsAt.getTime() : 0,
      totalLabel: showRevenue ? formatBRL(totalCents) : '',
      totalCents,
      fav,
      tag,
    };
  });

  return <ClientsList clients={rows} showRevenue={showRevenue} />;
}
