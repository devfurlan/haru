import { prisma } from '@haru/database';
import { formatBRL } from '@haru/shared';

import { isAttended } from '@/lib/appointment-status';
import { requireUserAndTenant } from '@/lib/auth';

import { ClientsList, type ClientRow } from './clients-list';

export default async function ClientsPage() {
  const { tenant } = await requireUserAndTenant();
  const now = Date.now();

  const contacts = await prisma.contact.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    take: 300,
    include: {
      appointments: {
        select: {
          startsAt: true,
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
    // Receita realizada = tudo que compareceu (passado, não cancelado, não faltou). Antes só
    // somava COMPLETED e, como ninguém marcava, subcontava. isAttended cobre também a janela
    // entre o atendimento e o cron de fechamento.
    const totalCents = c.appointments
      .filter((a) => isAttended(a, nowDate))
      .reduce((s, a) => s + a.service.priceCents, 0);

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
      totalLabel: formatBRL(totalCents),
      totalCents,
      fav,
      tag,
    };
  });

  return <ClientsList clients={rows} />;
}
