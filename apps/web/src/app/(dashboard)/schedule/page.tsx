import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';

import { ScheduleEditor } from './schedule-editor';

export default async function SchedulePage() {
  const { tenant } = await requireUserAndTenant();

  const blocks = await prisma.scheduleBlock.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Horários de atendimento</h1>
        <p className="text-sm text-muted-foreground">
          Defina os dias e horários que o bot pode oferecer ao cliente. Dias sem nenhum intervalo
          são considerados fechados.
        </p>
      </div>

      <ScheduleEditor
        initialBlocks={blocks.map((b) => ({
          weekday: b.weekday,
          startMinute: b.startMinute,
          endMinute: b.endMinute,
        }))}
      />
    </div>
  );
}
