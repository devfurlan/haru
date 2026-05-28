import { prisma } from '@haru/database';
import { CalendarCheck, Scissors } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUserAndTenant } from '@/lib/auth';

function formatWhen(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function DashboardPage() {
  const { tenant } = await requireUserAndTenant();

  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [upcoming, servicesCount, todayCount] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        startsAt: { gte: now, lt: horizon },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { service: true, contact: true },
      orderBy: { startsAt: 'asc' },
      take: 5,
    }),
    prisma.service.count({ where: { tenantId: tenant.id, active: true } }),
    prisma.appointment.count({
      where: {
        tenantId: tenant.id,
        startsAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {tenant.name}</h1>
        <p className="text-sm text-muted-foreground">Visão rápida do seu estabelecimento.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={<CalendarCheck className="h-4 w-4" />}
          label="Agendamentos hoje"
          value={String(todayCount)}
        />
        <StatCard
          icon={<Scissors className="h-4 w-4" />}
          label="Serviços ativos"
          value={String(servicesCount)}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Próximos 7 dias</CardTitle>
          <Link
            href="/appointments"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Ver todos
          </Link>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento próximo.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((appt) => (
                <li key={appt.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{formatWhen(appt.startsAt, tenant.timezone)}</span>
                  <span className="flex-1 px-3 text-muted-foreground">
                    {appt.service.name} · {appt.contact.name ?? appt.contact.phone}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
