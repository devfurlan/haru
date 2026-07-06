import 'server-only';

import { prisma } from '@haru/database';
import type { BillingCycle, ChargeKind, ChargeStatus, PlanTier } from '@haru/database';

import { authorizeInvoice, nfConfig, scheduleInvoice } from '@/lib/billing/asaas';

/**
 * Ledger local de cobranças da assinatura do SaaS. É a fonte de RASTREABILIDADE exigida:
 * cada linha (uma por pagamento no Asaas) carrega o vínculo com a Subscription + o
 * plano/ciclo/valor vigentes NO MOMENTO da cobrança (snapshot, grandfather). O webhook do
 * Asaas é o único escritor; tudo é idempotente por `asaasPaymentId` (o Asaas manda
 * CREATED, depois CONFIRMED e RECEIVED para o mesmo pagamento).
 */

/** Custo fixo de emissão de NF por cobrança (R$0,40), congelado pro cálculo de margem. */
export const NF_COST_CENTS = 40;

export interface RecordChargeInput {
  subscriptionId: string;
  asaasPaymentId: string;
  /** id da assinatura Asaas (recorrência). null em installment 12x e no setup avulso. */
  asaasSubscriptionId: string | null;
  kind: ChargeKind;
  planTier: PlanTier;
  billingCycle: BillingCycle;
  amountCents: number;
  status: ChargeStatus;
  dueDate: Date | null;
  paidAt: Date | null;
}

/**
 * Grava/atualiza (idempotente por asaasPaymentId) uma cobrança no ledger. Ao CONFIRMAR uma
 * cobrança ainda sem NF, dispara o gancho de emissão uma única vez (a checagem
 * `nfStatus === 'NONE'` lê o estado ANTES do update, então só a 1ª confirmação emite).
 */
export async function recordCharge(input: RecordChargeInput): Promise<void> {
  const charge = await prisma.charge.upsert({
    where: { asaasPaymentId: input.asaasPaymentId },
    create: {
      subscriptionId: input.subscriptionId,
      asaasPaymentId: input.asaasPaymentId,
      asaasSubscriptionId: input.asaasSubscriptionId,
      kind: input.kind,
      planTier: input.planTier,
      billingCycle: input.billingCycle,
      amountCents: input.amountCents,
      status: input.status,
      dueDate: input.dueDate,
      paidAt: input.paidAt,
    },
    update: {
      status: input.status,
      ...(input.paidAt ? { paidAt: input.paidAt } : {}),
      ...(input.status === 'REFUNDED' ? { refundedAt: new Date() } : {}),
    },
  });

  if (input.status === 'CONFIRMED' && charge.nfStatus === 'NONE') {
    await emitInvoiceForCharge(charge.id).catch((err) =>
      console.error('[billing] gancho de NF falhou', err),
    );
  }
}

/**
 * Gancho de emissão de NFS-e após pagamento confirmado (integração Asaas). Agenda + autoriza
 * a nota; a autorização pela prefeitura volta ASSÍNCRONA por webhook (INVOICE_AUTHORIZED →
 * nfStatus=ISSUED + custo; INVOICE_ERROR → FAILED) - por isso aqui só deixa nfStatus=PENDING.
 * Serve dois caminhos: 1ª emissão (charge NONE) e retentativa do cron (charge FAILED).
 *
 * Idempotência: um claim atômico leva NONE|FAILED → PENDING; só quem venceu o claim chama o
 * Asaas. CONFIRMED e RECEIVED chegam quase juntos pro mesmo pagamento - sem o claim, os dois
 * emitiriam (NF duplicada é problema fiscal real).
 *
 * Sem config fiscal (`nfConfig()` null: dev/sandbox, ou conta sem Configurações Fiscais) fica
 * no marcador PENDING e NÃO chama o Asaas.
 */
export async function emitInvoiceForCharge(chargeId: string): Promise<void> {
  const claimed = await prisma.charge.updateMany({
    where: { id: chargeId, nfStatus: { in: ['NONE', 'FAILED'] } },
    data: { nfStatus: 'PENDING', nfError: null, nfAttempts: { increment: 1 } },
  });
  // Já emitida ou em emissão por outra execução (dedup do webhook / corrida do claim).
  if (claimed.count === 0) return;

  const cfg = nfConfig();
  if (!cfg) {
    console.info(`[billing] NF em marcador p/ cobrança ${chargeId} (config fiscal ausente)`);
    return;
  }

  const charge = await prisma.charge.findUnique({ where: { id: chargeId } });
  if (!charge) return;

  try {
    const invoice = await scheduleInvoice({
      asaasPaymentId: charge.asaasPaymentId,
      valueCents: charge.amountCents,
      externalReference: `charge:${charge.id}`,
    });
    await authorizeInvoice(invoice.id);
    await prisma.charge.update({ where: { id: chargeId }, data: { asaasInvoiceId: invoice.id } });
    console.info(`[billing] NF agendada p/ cobrança ${chargeId} (invoice ${invoice.id})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.charge.update({
      where: { id: chargeId },
      data: { nfStatus: 'FAILED', nfError: message.slice(0, 500) },
    });
    console.error(`[billing] emissão de NF falhou p/ cobrança ${chargeId}`, err);
  }
}
