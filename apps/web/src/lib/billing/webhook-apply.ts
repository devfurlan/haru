import 'server-only';

import { prisma } from '@haru/database';
import type { BillingCycle, PaymentMethod } from '@haru/database';
import { getPublicPlan, snapshotPlan } from '@haru/billing';

import type { ParsedBillingEvent } from '@/lib/billing/asaas';
import {
  emailAddonAwaitingSetup,
  emailInvoiceIssued,
  emailOperatorAddonSetupPaid,
  emailPaymentReceipt,
  emailSubscriptionActivated,
  emailSubscriptionSuspended,
} from '@/lib/billing/email';
import { NF_COST_CENTS, recordCharge } from '@/lib/billing/ledger';
import { onPaymentFailed } from '@/lib/comms/events';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Fim do período: mensal = +1 mês; anual à vista OU 12x = +12 meses. */
function periodEnd(now: Date, cycle: BillingCycle): Date {
  return addMonths(now, cycle === 'MONTHLY' ? 1 : 12);
}

/** Cobrança recorrente/installment: PLAN_ADDON se o addon está embutido, senão PLAN. */
function planChargeKind(sub: { addonActivatedAt: Date | null; addonCanceledAt: Date | null }) {
  return sub.addonActivatedAt != null && sub.addonCanceledAt == null ? 'PLAN_ADDON' : 'PLAN';
}

/**
 * VIA ÚNICA de aplicação de um evento de billing ao nosso estado (status da assinatura,
 * downgrade agendado, addon, ledger e e-mails). Chamada com o MESMO ParsedBillingEvent tanto
 * pelo webhook do Asaas (evento real) quanto pela reconciliação (evento sintético a partir de
 * uma cobrança paga que o webhook não entregou). Idempotente por asaasPaymentId (recordCharge
 * é upsert; e-mail deduplica por lastBilledPaymentId; status já ACTIVE vira no-op).
 */
export async function applyBillingEvent(parsed: ParsedBillingEvent): Promise<void> {
  // Nota fiscal (NFS-e via Asaas): eventos INVOICE_* fecham o estado da NF de uma cobrança.
  // A emissão é agendada no gancho (recordCharge → emitInvoiceForCharge); a autorização pela
  // prefeitura é assíncrona e chega aqui. Reconcilia por asaasInvoiceId, com fallback pelo
  // pagamento (o AUTHORIZED pode chegar antes do gancho gravar o asaasInvoiceId).
  if (parsed.event?.startsWith('INVOICE_') && parsed.invoice) {
    const inv = parsed.invoice;
    const charge = await prisma.charge.findFirst({
      where: {
        OR: [
          { asaasInvoiceId: inv.asaasInvoiceId },
          ...(inv.asaasPaymentId ? [{ asaasPaymentId: inv.asaasPaymentId }] : []),
        ],
      },
      include: { subscription: { select: { tenantId: true } } },
    });
    if (charge) {
      if (parsed.event === 'INVOICE_AUTHORIZED') {
        // Idempotente: só age na 1ª autorização (o Asaas pode reenviar). Custo real de R$0,40
        // entra AQUI (o Asaas cobra só na autorização), não no agendamento.
        if (charge.nfStatus !== 'ISSUED') {
          await prisma.charge.update({
            where: { id: charge.id },
            data: {
              nfStatus: 'ISSUED',
              nfUrl: inv.pdfUrl,
              nfNumber: inv.number,
              nfError: null,
              nfCostCents: NF_COST_CENTS,
              asaasInvoiceId: inv.asaasInvoiceId,
            },
          });
          emailInvoiceIssued(charge.subscription.tenantId, {
            nfUrl: inv.pdfUrl,
            nfNumber: inv.number,
          }).catch((err) => console.error('[billing-webhook] email de NF falhou', err));
        }
      } else if (parsed.event === 'INVOICE_ERROR') {
        // Falha de emissão: marca FAILED (o cron retenta, com teto de nfAttempts). Não rebaixa
        // uma nota já ISSUED.
        if (charge.nfStatus !== 'ISSUED') {
          await prisma.charge.update({
            where: { id: charge.id },
            data: {
              nfStatus: 'FAILED',
              nfError: inv.error ?? inv.status ?? 'INVOICE_ERROR',
              asaasInvoiceId: inv.asaasInvoiceId,
            },
          });
        }
      } else if (parsed.event === 'INVOICE_CANCELED') {
        // Cancelamento (ação manual no Asaas): registra, mas NÃO marca FAILED - senão o cron
        // re-emitiria contra a intenção de quem cancelou.
        await prisma.charge.update({
          where: { id: charge.id },
          data: { nfError: 'Nota cancelada no Asaas' },
        });
      }
      // Demais INVOICE_* (CREATED/UPDATED/SYNCHRONIZED/PROCESSING_CANCELLATION/...) → no-op.
    }
    return;
  }

  // Cobrança AVULSA do setup do addon (número próprio): não tem `subscription` no Asaas,
  // então chega aqui antes do fluxo de recorrência. Ao confirmar, marca addonSetupChargedAt
  // (estado "aguardando verificação") e alerta o operador pra fazer a config da WABA + avisa
  // o tenant. NÃO ativa nem cobra mensalidade - isso é o 2º passo, o operador faz no admin.
  // Dedup: addonSetupChargedAt já setado = no-op (CONFIRMED e RECEIVED chegam pro mesmo pgto).
  if (parsed.effect === 'ACTIVE' && parsed.externalReference?.startsWith('addon-setup:')) {
    const subId = parsed.externalReference.slice('addon-setup:'.length);
    const setupSub = await prisma.subscription.findUnique({ where: { id: subId } });
    if (setupSub) {
      // Só marca "aguardando verificação" + alerta o operador se o addon AINDA é número
      // próprio e não foi ativado - senão (cliente trocou pra Demandaê / já ativado) uma
      // cobrança de setup abandonada e paga por engano corromperia o estado. O ledger abaixo
      // registra o pagamento de qualquer forma (rastreabilidade fiscal).
      if (
        setupSub.addonChannel === 'OWN' &&
        setupSub.addonActivatedAt == null &&
        setupSub.addonSetupChargedAt == null
      ) {
        await prisma.subscription.update({
          where: { id: setupSub.id },
          data: { addonSetupChargedAt: parsed.paidAt ?? new Date() },
        });
        emailOperatorAddonSetupPaid(setupSub.tenantId).catch((err) =>
          console.error('[billing-webhook] alerta setup addon (operador) falhou', err),
        );
        emailAddonAwaitingSetup(setupSub.tenantId).catch((err) =>
          console.error('[billing-webhook] email aguardando setup falhou', err),
        );
      }
      // Ledger: o setup (R$1.497) é uma cobrança própria, rastreável e com NF.
      if (parsed.asaasPaymentId) {
        await recordCharge({
          subscriptionId: setupSub.id,
          asaasPaymentId: parsed.asaasPaymentId,
          asaasSubscriptionId: null,
          kind: 'SETUP',
          planTier: setupSub.planTier,
          billingCycle: setupSub.billingCycle,
          amountCents: parsed.amountCents ?? setupSub.addonSetupFeeCents ?? 0,
          status: 'CONFIRMED',
          dueDate: parsed.dueDate,
          paidAt: parsed.paidAt ?? new Date(),
        });
      }
    }
    return;
  }

  // Proporcional do addon (avulso `addon-prorata:`): o addon já está ativo, isto é só um
  // recibo - registra a cobrança ADDON no ledger (rastreabilidade + NF) e segue.
  if (parsed.effect === 'ACTIVE' && parsed.externalReference?.startsWith('addon-prorata:')) {
    const subId = parsed.externalReference.slice('addon-prorata:'.length);
    const psub = await prisma.subscription.findUnique({ where: { id: subId } });
    if (psub && parsed.asaasPaymentId) {
      await recordCharge({
        subscriptionId: psub.id,
        asaasPaymentId: parsed.asaasPaymentId,
        asaasSubscriptionId: null,
        kind: 'ADDON',
        planTier: psub.planTier,
        billingCycle: psub.addonBillingCycle ?? psub.billingCycle,
        amountCents: parsed.amountCents ?? psub.addonPriceCents ?? 0,
        status: 'CONFIRMED',
        dueDate: parsed.dueDate,
        paidAt: parsed.paidAt ?? new Date(),
      });
    }
    return;
  }

  // Assinatura cancelada no lado do Asaas (ex.: pelo painel do Asaas): sincroniza nosso
  // estado em tempo real. Não "ressuscita" nem duplica um cancelamento/suspensão já feito.
  if (parsed.event === 'SUBSCRIPTION_DELETED' && parsed.asaasSubscriptionId) {
    const dsub = await prisma.subscription.findFirst({
      where: { asaasSubscriptionId: parsed.asaasSubscriptionId },
    });
    if (dsub && dsub.status !== 'CANCELED' && dsub.status !== 'SUSPENDED') {
      await prisma.subscription.update({
        where: { id: dsub.id },
        data: { status: 'CANCELED', canceledAt: new Date() },
      });
    }
    return;
  }

  // Resolve a Subscription da cobrança: recorrência (por asaasSubscriptionId) OU anual 12x
  // (installment avulso, cujo externalReference é o Subscription.id puro, sem prefixo `x:`).
  const installmentRef =
    !parsed.asaasSubscriptionId &&
    parsed.externalReference &&
    !parsed.externalReference.includes(':')
      ? parsed.externalReference
      : null;
  const sub = parsed.asaasSubscriptionId
    ? await prisma.subscription.findFirst({
        where: { asaasSubscriptionId: parsed.asaasSubscriptionId },
      })
    : installmentRef
      ? await prisma.subscription.findUnique({ where: { id: installmentRef } })
      : null;
  // Não achou (outro ambiente/sandbox, ou evento sem cobrança de assinatura) → no-op.
  if (!sub) {
    return;
  }

  const kind = planChargeKind(sub);
  // Anual 12x: NÃO é recorrência - as 12 parcelas são UMA venda anual (installment). O Asaas
  // pode emitir eventos por parcela; tratamos como uma cobrança só (1 registro, 1 NF, período
  // fixado uma vez) pra não estender o acesso a cada parcela nem emitir NF 12x.
  const isInstallment = installmentRef != null || sub.billingCycle === 'ANNUAL_INSTALLMENTS';

  // Cobrança CRIADA (ainda não paga): registra PENDING no ledger pra visibilidade em tempo
  // real da fatura emitida. Não mexe no status da assinatura. No 12x pulamos (o Asaas cria
  // uma cobrança por parcela; a venda vira um registro só quando a 1ª confirmar, abaixo).
  if (parsed.event === 'PAYMENT_CREATED') {
    if (parsed.asaasPaymentId && !isInstallment) {
      await recordCharge({
        subscriptionId: sub.id,
        asaasPaymentId: parsed.asaasPaymentId,
        asaasSubscriptionId: sub.asaasSubscriptionId,
        kind,
        planTier: sub.planTier,
        billingCycle: sub.billingCycle,
        amountCents: parsed.amountCents ?? sub.priceCents,
        status: 'PENDING',
        dueDate: parsed.dueDate,
        paidAt: null,
      });
    }
    return;
  }

  // Evento sem efeito de status (e não é CREATED, já tratado) → no-op.
  if (!parsed.effect) {
    return;
  }

  if (parsed.effect === 'ACTIVE') {
    const now = parsed.paidAt ?? new Date();
    const wasActive = sub.status === 'ACTIVE';

    // 12x já ativo: esta é a liquidação de uma parcela seguinte da MESMA venda anual. Não
    // reativa, não estende o período (senão daria +12 meses por parcela) nem gera nova NF.
    if (isInstallment && wasActive) {
      return;
    }

    // Dedup: o Asaas manda CONFIRMED e RECEIVED para a MESMA cobrança. Só age (e envia
    // e-mail) na primeira vez que vê este paymentId; a 2ª passa direto (idempotente).
    const alreadyBilled =
      parsed.asaasPaymentId != null && sub.lastBilledPaymentId === parsed.asaasPaymentId;

    // Downgrade agendado aplica AGORA, no início do novo ciclo: troca o snapshot pelo
    // plano pendente. O ciclo efetivo (pendente ou atual) também define currentPeriodEnd.
    // Idempotente: após aplicar, pending zera - a 2ª notificação da mesma cobrança é no-op.
    const effectiveCycle = sub.pendingBillingCycle ?? sub.billingCycle;
    let planChange = {};
    if (sub.pendingPlanTier) {
      // Downgrade agendado é sempre p/ plano público (só o self-serve agenda troca).
      const pendingPlan = await getPublicPlan(sub.pendingPlanTier);
      if (pendingPlan) {
        planChange = {
          planTier: sub.pendingPlanTier,
          planId: pendingPlan.id,
          billingCycle: effectiveCycle,
          ...snapshotPlan(pendingPlan, effectiveCycle),
          pendingPlanTier: null,
          pendingBillingCycle: null,
        };
      }
    }

    // Addon desativado: ao virar o ciclo, o addon expira de fato (limpa o snapshot INTEIRO,
    // inclusive canal e o marcador de setup pago - senão uma re-ativação futura herdaria um
    // "setup já pago" obsoleto e um canal antigo).
    const addonClear = sub.addonCanceledAt
      ? {
          addonTier: null,
          addonChannel: null,
          addonBillingCycle: null,
          addonPriceCents: null,
          addonSetupFeeCents: null,
          addonConversationsLimit: null,
          addonSetupChargedAt: null,
          addonActivatedAt: null,
          addonCanceledAt: null,
        }
      : {};

    // Sincroniza a forma de pagamento com o que efetivamente cobrou (mantém o badge/últimos-4
    // fiéis mesmo quando o método foi escolhido no checkout hospedado, sem passar por
    // changePaymentMethod). Só grava o que veio; não zera um valor bom com null.
    const methodFromWebhook: PaymentMethod | null =
      parsed.billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : parsed.billingType === 'PIX' ? 'PIX' : null;
    const paymentPatch = {
      ...(methodFromWebhook ? { paymentMethod: methodFromWebhook } : {}),
      ...(parsed.cardLast4 ? { cardLast4: parsed.cardLast4 } : {}),
      ...(parsed.cardBrand ? { cardBrand: parsed.cardBrand } : {}),
    };

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd(now, effectiveCycle),
        canceledAt: null,
        lastBilledPaymentId: parsed.asaasPaymentId ?? sub.lastBilledPaymentId,
        // Renovou: rearma o lembrete de renovação pro próximo ciclo (o cron dispara de novo).
        renewalReminderSentAt: null,
        ...planChange,
        ...addonClear,
        ...paymentPatch,
      },
    });

    if (!alreadyBilled) {
      // 1ª confirmação desta cobrança: ativação (se não estava ativa) ou recibo de renovação.
      const send = wasActive
        ? emailPaymentReceipt(sub.tenantId, parsed.amountCents)
        : emailSubscriptionActivated(sub.tenantId);
      send.catch((err) => console.error('[billing-webhook] email (active) falhou', err));
    }

    // Ledger: registra a mensalidade/anuidade/installment como paga (dispara o gancho de NF).
    if (parsed.asaasPaymentId) {
      await recordCharge({
        subscriptionId: sub.id,
        asaasPaymentId: parsed.asaasPaymentId,
        asaasSubscriptionId: sub.asaasSubscriptionId,
        kind,
        planTier: sub.planTier,
        billingCycle: sub.billingCycle,
        amountCents: parsed.amountCents ?? sub.priceCents,
        status: 'CONFIRMED',
        dueDate: parsed.dueDate,
        paidAt: now,
      });
    }
  } else if (parsed.effect === 'PAST_DUE') {
    // Sem carência: pagamento vencido corta o acesso na hora (PAST_DUE não é ativo).
    // Só marca se já não estiver suspensa/cancelada (não "ressuscita" um cancelamento).
    if (sub.status === 'ACTIVE' || sub.status === 'PENDING') {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'PAST_DUE' },
      });
      // Fan-out: e-mail + notificação in-app + WhatsApp opt-in pro dono.
      onPaymentFailed(sub.tenantId).catch((err) =>
        console.error('[billing-webhook] fan-out cobrança falhou', err),
      );
    }
    if (parsed.asaasPaymentId) {
      await recordCharge({
        subscriptionId: sub.id,
        asaasPaymentId: parsed.asaasPaymentId,
        asaasSubscriptionId: sub.asaasSubscriptionId,
        kind,
        planTier: sub.planTier,
        billingCycle: sub.billingCycle,
        amountCents: parsed.amountCents ?? sub.priceCents,
        status: 'OVERDUE',
        dueDate: parsed.dueDate,
        paidAt: null,
      });
    }
  } else if (parsed.effect === 'SUSPENDED') {
    if (sub.status !== 'SUSPENDED') {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'SUSPENDED', canceledAt: new Date() },
      });
      emailSubscriptionSuspended(sub.tenantId).catch((err) =>
        console.error('[billing-webhook] email suspensão falhou', err),
      );
    }
    if (parsed.asaasPaymentId) {
      // Estorno vira REFUNDED; exclusão/chargeback vira CANCELED.
      await recordCharge({
        subscriptionId: sub.id,
        asaasPaymentId: parsed.asaasPaymentId,
        asaasSubscriptionId: sub.asaasSubscriptionId,
        kind,
        planTier: sub.planTier,
        billingCycle: sub.billingCycle,
        amountCents: parsed.amountCents ?? sub.priceCents,
        status: parsed.event === 'PAYMENT_REFUNDED' ? 'REFUNDED' : 'CANCELED',
        dueDate: parsed.dueDate,
        paidAt: null,
      });
    }
  }
}
