import { prisma } from '@haru/database';
import { CalendarCheck, MessageCircleWarning, Scissors } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUserAndTenant } from '@/lib/auth';
import { formatPhoneBR } from '@/lib/format';
import { isWhatsappConnected } from '@/lib/whatsapp-status';

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

  const whatsappConnected = isWhatsappConnected(tenant);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Olá, {tenant.name}</h1>
        <p className="text-muted-foreground text-sm">Visão rápida do seu estabelecimento.</p>
      </div>

      {!whatsappConnected && (
        <Link href="/settings" className="block">
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 transition-colors hover:bg-amber-100">
            <MessageCircleWarning className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Seu WhatsApp ainda não está conectado</p>
              <p className="text-amber-800">
                Enquanto não conectar, o bot não recebe nem responde mensagens dos seus clientes.
                Clique aqui para configurar em Configurações.
              </p>
            </div>
          </div>
        </Link>
      )}

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
            className="text-muted-foreground text-xs underline-offset-4 hover:underline"
          >
            Ver todos
          </Link>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum agendamento próximo.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((appt) => (
                <li key={appt.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{formatWhen(appt.startsAt, tenant.timezone)}</span>
                  <span className="text-muted-foreground flex-1 px-3">
                    {appt.service.name} · {appt.contact.name ?? formatPhoneBR(appt.contact.phone)}
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-md">{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-muted-foreground text-xs">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
