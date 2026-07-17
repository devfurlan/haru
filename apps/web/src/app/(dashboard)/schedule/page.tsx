import { prisma } from '@haru/database';

import { requireAdmin } from '@/lib/auth';

import { ScheduleEditor } from './schedule-editor';

export default async function SchedulePage() {
  const { tenant } = await requireAdmin();

  // Cada profissional (com agenda) tem sua própria grade. No caso solo é só o dono.
  const professionals = await prisma.user.findMany({
    where: { tenantId: tenant.id, isProfessional: true },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      scheduleBlocks: {
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
        select: { weekday: true, startMinute: true, endMinute: true },
      },
    },
  });

  const multi = professionals.length > 1;

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4">
      <div>
        <h1 className="font-serif text-[28px] tracking-tight text-ink">Horários de atendimento</h1>
        <p className="mt-1 text-sm text-ink-50">
          {multi
            ? 'Defina quando cada profissional atende. Fora disso, nem aparece pro cliente.'
            : 'Defina quando dá pra marcar. Fora disso, nem aparece pro cliente.'}
        </p>
      </div>

      <ScheduleEditor
        professionals={professionals.map((p) => ({
          id: p.id,
          name: p.name,
          blocks: p.scheduleBlocks,
        }))}
      />
    </div>
  );
}
