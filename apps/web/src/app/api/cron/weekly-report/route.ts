import { prisma } from '@haru/database';

import { onWeeklyReport } from '@/lib/comms/events';
import { getWeeklyReportData } from '@/lib/weekly-report';
import { weekWindow } from '@/lib/weekly-report-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron do RELATÓRIO SEMANAL do dono (Vercel Cron - ver apps/web/vercel.json). Retenção
 * pura: vale em TODOS os planos, sem gate de tier.
 *
 * Agendado pra segunda 11:00 UTC = 08:00 em Brasília. ponytail: sem gate de weekday por
 * tenant porque em toda a faixa de fusos do Brasil (UTC-2..-5) esse instante é sempre
 * segunda de manhã - a virada do dia nunca é cruzada. Se um dia entrar tenant fora do
 * Brasil, passar o cron pra diário e gatear no weekday LOCAL (weekWindow já é por fuso).
 *
 * A janela relatada (segunda a domingo anterior) é sempre calculada no fuso do tenant, se
 * não o faturamento de domingo à noite cairia na semana errada.
 *
 * Idempotente: `weeklyReportSentForWeek` guarda a semana já relatada e é carimbado DEPOIS
 * do despacho, então retry da Vercel (500) ou disparo manual no meio da semana viram no-op.
 * Protegido por CRON_SECRET (fail-closed, igual aos outros crons).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();
  const tenants = await prisma.tenant.findMany({
    where: { weeklyReportEnabled: true },
    select: {
      id: true,
      timezone: true,
      waitlistEnabled: true,
      reminderMinutesBefore: true,
      weeklyReportChannel: true,
      weeklyReportSentForWeek: true,
    },
  });

  let sent = 0;
  let skipped = 0;
  for (const t of tenants) {
    try {
      // Gate barato antes de qualquer consulta pesada.
      if (t.weeklyReportSentForWeek === weekWindow(now, t.timezone).weekKey) {
        skipped++;
        continue;
      }

      // null = semana sem nenhum agendamento. Relatório vazio é deprimente e inútil:
      // não envia (e não carimba - se a semana era parada, não há o que relatar).
      const data = await getWeeklyReportData(t, now);
      if (!data) {
        skipped++;
        continue;
      }

      await onWeeklyReport(t.id, data, t.weeklyReportChannel);
      await prisma.tenant.update({
        where: { id: t.id },
        data: { weeklyReportSentForWeek: data.weekKey },
      });
      sent++;
    } catch (err) {
      console.error('[cron-weekly-report] falhou p/ tenant', t.id, err);
    }
  }

  return Response.json({ ok: true, checked: tenants.length, sent, skipped });
}
