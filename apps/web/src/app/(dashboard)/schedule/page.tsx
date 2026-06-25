import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';

import { ScheduleEditor } from './schedule-editor';

export default async function SchedulePage() {
  const { tenant } = await requireUserAndTenant();

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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Horários de atendimento
        </h1>
        <p className="text-sm text-muted-foreground">
          {multi
            ? 'Defina os dias e horários de cada profissional. Dias sem nenhum intervalo são considerados fechados.'
            : 'Defina os dias e horários que o bot pode oferecer ao cliente. Dias sem nenhum intervalo são considerados fechados.'}
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
