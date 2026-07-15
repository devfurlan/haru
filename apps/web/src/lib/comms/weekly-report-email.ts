import 'server-only';

// Envio do e-mail do RELATÓRIO SEMANAL pro dono. Mesmo papel do billing/email.ts, mas do
// lado de retenção: resolve o destinatário, monta o HTML branded e despacha. Best-effort -
// sem OWNER com e-mail ou sem env do Resend, vira no-op (o sendEmail já loga).

import { brandedOwnerEmail } from '@/lib/appointment-email';
import { ownerOf, sendEmail } from '@/lib/email';
import type { WeeklyReportData } from '@/lib/weekly-report-core';

import { weeklyReportEmail } from './copy';

/** Relatório completo: painel de números + insight + botão pro painel. */
export async function emailWeeklyReport(
  tenantId: string,
  data: WeeklyReportData,
  reportUrl: string,
): Promise<void> {
  const o = await ownerOf(tenantId);
  if (!o) return;
  const { subject, intro, hero, callout, rows } = weeklyReportEmail(o.name, o.tenantName, data);
  await sendEmail(
    o.email,
    subject,
    brandedOwnerEmail({
      title: 'Resumo da semana',
      intro,
      hero,
      callout,
      rows,
      ctaLabel: 'Ver meu painel',
      ctaLink: reportUrl,
    }),
  );
}
