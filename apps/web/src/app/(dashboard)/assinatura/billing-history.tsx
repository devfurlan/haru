import { listSubscriptionPayments, type BillingCharge } from '@/lib/billing/asaas';

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  // Datas do Asaas vêm como "YYYY-MM-DD" (sem hora) - evita shift de fuso.
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
}

/** Status bruto do Asaas → rótulo PT-BR + cor. */
function statusInfo(status: string): { label: string; className: string } {
  switch (status) {
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
      return { label: 'Pago', className: 'text-emerald-700' };
    case 'OVERDUE':
      return { label: 'Vencido', className: 'text-red-600' };
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'CHARGEBACK_REQUESTED':
      return { label: 'Estornado', className: 'text-amber-700' };
    default:
      return { label: 'Pendente', className: 'text-muted-foreground' };
  }
}

/**
 * Histórico de cobranças da assinatura, lido sob demanda do Asaas (não armazenamos as
 * cobranças do SaaS no nosso banco). Falha graciosa: se o Asaas não responder, some.
 */
export async function BillingHistory({ asaasSubscriptionId }: { asaasSubscriptionId: string }) {
  let charges: BillingCharge[] = [];
  try {
    charges = await listSubscriptionPayments(asaasSubscriptionId);
  } catch (err) {
    console.error('[billing-history] falhou', err);
    return null;
  }
  if (charges.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border p-6">
      <h2 className="mb-4 font-medium">Histórico de cobranças</h2>
      <div className="space-y-1 text-sm">
        {charges.map((c) => {
          const s = statusInfo(c.status);
          return (
            <div key={c.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
              <span className="text-muted-foreground">{fmtDate(c.paidAt ?? c.dueDate)}</span>
              <span className="flex-1 text-right tabular-nums">{fmtBRL(c.amountCents)}</span>
              <span className={`w-20 text-right ${s.className}`}>{s.label}</span>
              <span className="w-16 text-right">
                {c.invoiceUrl ? (
                  <a href={c.invoiceUrl} target="_blank" rel="noreferrer" className="underline">
                    fatura
                  </a>
                ) : (
                  '—'
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
