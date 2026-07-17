import { prisma } from '@haru/database';
import { formatBRL } from '@haru/shared';
import Link from 'next/link';

import { initialsOf } from '@/components/dashboard/nav-config';
import { requireAdmin } from '@/lib/auth';

import { UsersCard, type UserRow } from '../settings/users-card';

export default async function TeamPage() {
  const { tenant, id: currentUserId } = await requireAdmin();

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [professionals, users, todayAppts] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: tenant.id, isProfessional: true },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        professionalServices: { select: { service: { select: { name: true } } } },
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.user.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        isProfessional: true,
        avatarUrl: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    }),
    prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        startsAt: { gte: dayStart, lt: dayEnd },
        status: { not: 'CANCELED' },
      },
      select: { professionalId: true, service: { select: { priceCents: true } } },
    }),
  ]);

  // Agrega hoje/receita por profissional.
  const stats = new Map<string, { count: number; revenue: number }>();
  for (const a of todayAppts) {
    const s = stats.get(a.professionalId) ?? { count: 0, revenue: 0 };
    s.count += 1;
    s.revenue += a.service.priceCents;
    stats.set(a.professionalId, s);
  }

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <div>
        <h1 className="font-serif text-[28px] tracking-tight text-ink">Equipe</h1>
        <p className="mt-1 text-sm text-ink-50">
          Cada profissional com a própria agenda, no app e na página.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-3.5">
        {professionals.map((p) => {
          const st = stats.get(p.id) ?? { count: 0, revenue: 0 };
          const services = p.professionalServices.map((ps) => ps.service.name);
          return (
            <div key={p.id} className="rounded-[18px] border border-line bg-paper p-[18px] shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex size-[46px] flex-none items-center justify-center overflow-hidden rounded-[14px] bg-chip font-serif text-[15px] text-green-emph">
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    initialsOf(p.name, 'P')
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-serif text-[17px] text-ink">{p.name ?? 'Profissional'}</div>
                  <div className="text-xs text-ink-50">Profissional</div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-chip px-2.5 py-1.5 text-[10.5px] font-semibold text-green-emph">
                  <span className="size-1.5 rounded-full bg-green-bright" />
                  Ativo
                </span>
              </div>

              <div className="my-3.5 border-t border-dashed border-edge" />

              <div className="flex flex-col gap-2 text-[12.5px]">
                <Stat label="Hoje" value={`${st.count} ${st.count === 1 ? 'agendamento' : 'agendamentos'}`} />
                <Stat label="Receita prevista" value={formatBRL(st.revenue)} valueClass="text-green-emph" />
                <Stat
                  label="Serviços que faz"
                  value={services.length === 0 ? 'todos' : services.length <= 2 ? services.join(', ') : `${services.length} serviços`}
                />
              </div>

              <Link
                href="/appointments"
                className="mt-3.5 block rounded-xl border border-edge py-2.5 text-center text-[12.5px] font-semibold text-ink-70 no-underline hover:bg-cream-2"
              >
                Ver agenda de hoje
              </Link>
            </div>
          );
        })}
      </div>

      <UsersCard users={users as UserRow[]} currentUserId={currentUserId} />
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-50">{label}</span>
      <span className={`text-right font-semibold ${valueClass ?? 'text-ink'}`}>{value}</span>
    </div>
  );
}
