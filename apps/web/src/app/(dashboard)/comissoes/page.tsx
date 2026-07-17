import { FEATURE_MIN_TIER, hasCommissions, TIER_LABEL } from '@haru/billing';
import { formatBRL } from '@haru/shared';
import { Lock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { requireAdmin } from '@/lib/auth';
import { describeCompensation } from '@/lib/commission-core';
import { getCommissionReport, type CommissionPeriodKey } from '@/lib/commissions';

import { CompensationEditor, CopySummaryButton } from './commissions-client';

export const dynamic = 'force-dynamic';

const MIN_TIER = TIER_LABEL[FEATURE_MIN_TIER.commissions]; // "Multi"

const PERIODS: { key: CommissionPeriodKey; label: string }[] = [
  { key: 'month', label: 'Este mês' },
  { key: 'lastMonth', label: 'Mês passado' },
  { key: 'week', label: 'Esta semana' },
];

function Header() {
  return (
    <div>
      <h1 className="text-ink font-serif text-[28px] tracking-tight">Comissões</h1>
      <p className="text-ink-50 mt-1 text-sm">
        Quanto cada profissional gerou e o que você tem a acertar no fim do período.
      </p>
    </div>
  );
}

function settlementText(row: { settlement: { direction: string; cents: number } }): string {
  if (row.settlement.direction === 'PAY') return `a pagar ${formatBRL(row.settlement.cents)}`;
  if (row.settlement.direction === 'RECEIVE') return `a receber ${formatBRL(row.settlement.cents)}`;
  return '-';
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { tenant } = await requireAdmin();

  // Descoberta > ocultação: mostra o teaser (upsell), o write já é barrado no servidor.
  if (!hasCommissions(tenant.subscription)) {
    return (
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4">
        <Header />
        <div className="border-edge bg-paper shadow-soft rounded-[22px] border border-dashed px-7 py-11 text-center">
          <div className="bg-chip text-green-emph mx-auto mb-3.5 flex size-[60px] items-center justify-center rounded-[17px]">
            <Lock className="size-6" />
          </div>
          <div className="text-ink font-serif text-[25px] tracking-tight">
            Uma ferramenta do plano <em className="text-green-emph italic">{MIN_TIER}</em>
          </div>
          <p className="text-ink-70 mx-auto mt-2.5 max-w-[470px] text-[13.5px] leading-relaxed">
            Configure como cada profissional é pago (comissão %, valor fixo ou aluguel de cadeira) e
            feche o mês em um clique - o Demandaê calcula sozinho quanto é de cada um. Disponível a
            partir do <strong className="text-ink font-semibold">{MIN_TIER}</strong>.
          </p>
          <Button asChild variant="coral" className="mt-5">
            <a href="/assinatura">Ver planos do Demandaê</a>
          </Button>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const period: CommissionPeriodKey =
    sp.period === 'week' || sp.period === 'lastMonth' ? sp.period : 'month';
  const report = await getCommissionReport(tenant, period);

  const hasChairRent = report.rows.some((r) => r.model === 'CHAIR_RENT');
  const anyConfigured = report.rows.some((r) => r.configured);

  // Texto pra copiar (WhatsApp/planilha) - o "fecha o mês em 1 clique".
  const copyText = [
    `Comissões - ${report.label}`,
    '',
    ...report.rows.map(
      (r) =>
        `${r.professionalName ?? 'Profissional'}: ${r.count} atend. · gerou ${formatBRL(r.revenueCents)} · ${describeCompensation(r.config)} · ${settlementText(r)}`,
    ),
    '',
    `Total gerado: ${formatBRL(report.totals.revenueCents)}`,
    `A pagar (comissões): ${formatBRL(report.totals.totalPayCents)}`,
    `A receber (aluguéis): ${formatBRL(report.totals.totalReceiveCents)}`,
  ].join('\n');

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
      <Header />

      {/* Config: como cada profissional é pago */}
      <div className="border-line bg-paper shadow-soft rounded-[18px] border p-5">
        <div className="text-ink font-serif text-lg">Como cada profissional é pago</div>
        <p className="text-ink-50 mt-0.5 text-[12.5px]">
          Escolha o modelo de remuneração de cada um. É o que o cálculo do fechamento usa.
        </p>
        <div className="divide-edge mt-3.5 flex flex-col divide-y divide-dashed">
          {report.rows.length === 0 && (
            <p className="text-ink-50 py-4 text-[13px]">
              Nenhum profissional cadastrado ainda. Adicione a equipe em{' '}
              <Link href="/team" className="text-green-emph font-semibold hover:underline">
                Equipe
              </Link>
              .
            </p>
          )}
          {report.rows.map((r) => (
            <div key={r.professionalId} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-ink truncate text-[13.5px] font-semibold">
                  {r.professionalName ?? 'Profissional'}
                </div>
                <div className={`text-[12px] ${r.configured ? 'text-ink-50' : 'text-coral-deep'}`}>
                  {describeCompensation(r.config)}
                </div>
              </div>
              <CompensationEditor
                pro={{ id: r.professionalId, name: r.professionalName, config: r.config }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fechamento do período */}
      <div className="border-line bg-paper shadow-soft overflow-hidden rounded-[18px] border">
        <div className="flex flex-wrap items-center gap-3 p-5 pb-3">
          <div className="min-w-0 flex-1">
            <div className="text-ink font-serif text-lg">Fechamento</div>
            <div className="text-ink-50 text-[12.5px]">{report.label}</div>
          </div>
          <CopySummaryButton text={copyText} />
        </div>

        {/* Seletor de período */}
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/comissoes?period=${p.key}`}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold no-underline transition-colors ${
                p.key === period
                  ? 'border-green-emph bg-chip text-green-emph'
                  : 'border-line text-ink-70 hover:bg-cream-2'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {/* Tabela por profissional */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-[13px]">
            <thead>
              <tr className="text-ink-50 border-edge border-y border-dotted text-[10.5px] font-bold uppercase tracking-[0.1em]">
                <th className="px-5 py-2.5 text-left font-bold">Profissional</th>
                <th className="px-3 py-2.5 text-right font-bold">Atend.</th>
                <th className="px-3 py-2.5 text-right font-bold">Gerado</th>
                <th className="px-3 py-2.5 text-left font-bold">Modelo</th>
                <th className="px-5 py-2.5 text-right font-bold">Acerto</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.professionalId} className="border-edge border-b border-dotted">
                  <td className="text-ink px-5 py-2.5 font-semibold">
                    {r.professionalName ?? 'Profissional'}
                  </td>
                  <td className="text-ink-70 px-3 py-2.5 text-right tabular-nums">{r.count}</td>
                  <td className="text-ink px-3 py-2.5 text-right font-serif tabular-nums">
                    {formatBRL(r.revenueCents)}
                  </td>
                  <td className="text-ink-50 px-3 py-2.5">{describeCompensation(r.config)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums">
                    {r.settlement.direction === 'RECEIVE' ? (
                      <span className="text-green-emph">
                        a receber {formatBRL(r.settlement.cents)}
                      </span>
                    ) : r.settlement.direction === 'PAY' ? (
                      <span className="text-ink">a pagar {formatBRL(r.settlement.cents)}</span>
                    ) : (
                      <span className="text-ink-30">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-ink border-edge border-t-2">
                <td className="px-5 py-3 font-serif text-[14px]">Total</td>
                <td className="px-3 py-3" />
                <td className="text-ink px-3 py-3 text-right font-serif tabular-nums">
                  {formatBRL(report.totals.revenueCents)}
                </td>
                <td className="px-3 py-3" />
                <td className="px-5 py-3 text-right">
                  <div className="flex flex-col items-end gap-0.5 text-[12.5px]">
                    {report.totals.totalPayCents > 0 && (
                      <span className="text-ink font-semibold">
                        a pagar {formatBRL(report.totals.totalPayCents)}
                      </span>
                    )}
                    {report.totals.totalReceiveCents > 0 && (
                      <span className="text-green-emph font-semibold">
                        a receber {formatBRL(report.totals.totalReceiveCents)}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {!anyConfigured && report.rows.length > 0 && (
          <p className="text-ink-50 px-5 py-3.5 text-[12.5px]">
            Defina o modelo de remuneração de cada profissional acima pra o acerto ser calculado.
          </p>
        )}
        {hasChairRent && (
          <p className="text-ink-50 border-edge border-t border-dashed px-5 py-3.5 text-[12px] leading-snug">
            Aluguel de cadeira: o valor dos serviços é do profissional; a casa recebe só o aluguel.
            Por isso o &quot;gerado&quot; não é receita da casa nesses casos.
          </p>
        )}
      </div>
    </div>
  );
}
