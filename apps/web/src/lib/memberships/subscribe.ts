import 'server-only';

import { prisma, type Tenant } from '@haru/database';
import { hasServiceSubscriptions } from '@haru/billing';
import {
  decryptNullable,
  getGatewayForTenant,
  GatewayNotImplementedError,
  PaymentConfigError,
} from '@haru/payments';
import { isValidCpfCnpj, onlyDigits } from '@haru/shared';

import {
  notifyOwnerMemberCanceled,
  notifySubscriptionCanceled,
} from '@/lib/comms/subscription-events';

/**
 * Assinatura de serviços do cliente final. O cliente assina um MembershipPlan do tenant e
 * paga mensal pelo gateway do PRÓPRIO tenant (dinheiro cai na conta do dono). A ativação e a
 * recarga de créditos são webhook-driven (ver memberships/webhook-apply). Aqui só criamos a
 * Membership PENDING + a assinatura recorrente no gateway e devolvemos o checkout (o cliente
 * digita o cartão na fatura hospedada). Gate NÃO-BURLÁVEL: feature Time+ do DONO.
 */

export type SubscribeResult =
  | { error: string; needsDocument?: boolean }
  | {
      ok: true;
      membershipId: string;
      checkoutUrl: string | null;
      pixQrCode: string | null;
      pixCopyPaste: string | null;
    };

export async function createServiceSubscription(args: {
  slug: string;
  planId: string;
  customerAccountId: string;
  /** CPF/CNPJ do form quando a conta ainda não tem documento salvo. */
  document?: string;
  method?: 'CREDIT_CARD' | 'PIX';
}): Promise<SubscribeResult> {
  const { slug, planId, customerAccountId, method = 'CREDIT_CARD' } = args;

  const account = await prisma.customerAccount.findUnique({
    where: { id: customerAccountId },
    select: { id: true, name: true, email: true, phone: true, document: true },
  });
  if (!account) return { error: 'Conta não encontrada' };

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    include: { tenant: { include: { subscription: true } } },
  });
  if (!plan || plan.tenant.slug !== slug) return { error: 'Plano não encontrado' };
  if (!plan.active) return { error: 'Este plano não está disponível no momento' };

  const { tenant } = plan;
  // Gate NÃO-BURLÁVEL server-side: assinatura de serviços é feature Time+ do DONO.
  if (!hasServiceSubscriptions(tenant.subscription)) {
    return { error: 'Assinaturas indisponíveis neste estabelecimento' };
  }
  if (!tenant.paymentProvider) {
    return { error: 'Pagamento não configurado neste estabelecimento' };
  }

  // 1 assinatura por (plano, cliente): reusa a linha CANCELED (reativação), bloqueia se ativa.
  const existing = await prisma.membership.findUnique({
    where: { planId_customerAccountId: { planId, customerAccountId } },
    select: { id: true, status: true },
  });
  if (existing && existing.status !== 'CANCELED') {
    return { error: 'Você já assina este plano' };
  }

  // CPF do pagador (o Asaas exige pra assinatura). Do form ou do cadastro (cifrado at rest).
  const documentDigits = args.document ? onlyDigits(args.document) : '';
  const saved = decryptNullable(account.document);
  const cpfCnpj = documentDigits || saved || '';
  if (!cpfCnpj) return { error: 'Pra assinar, informe seu CPF.', needsDocument: true };
  if (!isValidCpfCnpj(cpfCnpj)) {
    return { error: 'CPF inválido. Confira e tente de novo.', needsDocument: true };
  }

  // Membership PENDING com SNAPSHOT do plano (grandfather). O id vira externalReference.
  const snapshot = {
    tenantId: tenant.id,
    planId,
    customerAccountId,
    status: 'PENDING' as const,
    planName: plan.name,
    priceCents: plan.priceCents,
    creditsPerCycle: plan.creditsPerCycle,
    creditRollover: plan.creditRollover,
    rolloverCap: plan.rolloverCap,
    provider: tenant.paymentProvider,
    creditBalance: 0,
  };
  const isNew = !existing;
  const membership = existing
    ? await prisma.membership.update({
        where: { id: existing.id },
        data: { ...snapshot, canceledAt: null, gatewaySubscriptionId: null },
        select: { id: true },
      })
    : await prisma.membership.create({ data: snapshot, select: { id: true } });

  try {
    const gw = getGatewayForTenant(tenant);
    const result = await gw.createSubscription({
      amountCents: plan.priceCents,
      description: `${plan.name} - ${tenant.name}`,
      externalReference: membership.id,
      method,
      customer: {
        name: account.name ?? 'Cliente',
        cpfCnpj,
        email: account.email,
        phoneE164: account.phone,
      },
    });
    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        gatewaySubscriptionId: result.externalSubscriptionId,
        gatewayCustomerId: result.gatewayCustomerId,
      },
    });
    return {
      ok: true,
      membershipId: membership.id,
      checkoutUrl: result.firstCharge?.checkoutUrl ?? null,
      pixQrCode: result.firstCharge?.pixQrCode ?? null,
      pixCopyPaste: result.firstCharge?.pixCopyPaste ?? null,
    };
  } catch (err) {
    // Falha no gateway: nenhuma cobrança foi criada. Remove a Membership órfã recém-criada;
    // na reativação, volta pra CANCELED (preserva o histórico da linha).
    if (isNew) {
      await prisma.membership.delete({ where: { id: membership.id } }).catch(() => {});
    } else {
      await prisma.membership
        .update({ where: { id: membership.id }, data: { status: 'CANCELED' } })
        .catch(() => {});
    }
    if (err instanceof GatewayNotImplementedError || err instanceof PaymentConfigError) {
      return { error: err.message };
    }
    console.error('[membership-subscribe] createSubscription falhou', err);
    return { error: 'Não deu pra iniciar a assinatura agora. Tente de novo.' };
  }
}

/**
 * Núcleo do cancelamento, compartilhado pelo cliente (self-service) e pelo DONO (no painel).
 * Para as cobranças futuras no gateway, mas os créditos VALEM até o fim do ciclo já pago
 * (currentPeriodEnd) - não zera o saldo. O consumo re-checa isso (CANCELED dentro do período
 * ainda desconta). Idempotente: já cancelada = no-op. `tenant` é a conta do gateway.
 */
async function cancelMembershipCore(
  membership: { id: string; status: string; gatewaySubscriptionId: string | null; tenant: Tenant },
): Promise<void> {
  if (membership.status === 'CANCELED') return;

  // Cancela no gateway (para as próximas). Fail-soft: se o gateway recusar, ainda marcamos
  // cancelado localmente - foi pedido e a intenção é não cobrar de novo.
  if (membership.gatewaySubscriptionId) {
    try {
      const gw = getGatewayForTenant(membership.tenant);
      await gw.cancelSubscription(membership.gatewaySubscriptionId);
    } catch (err) {
      console.error('[membership-subscribe] cancelSubscription falhou', err);
    }
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { status: 'CANCELED', canceledAt: new Date() },
  });

  notifySubscriptionCanceled(membership.id).catch((err) =>
    console.error('[membership-subscribe] notify canceled failed', err),
  );
  notifyOwnerMemberCanceled(membership.id).catch((err) =>
    console.error('[membership-subscribe] notify owner canceled failed', err),
  );
}

/** Cancelamento pelo CLIENTE (app/web público). Trava por customerAccountId (dono do pagamento). */
export async function cancelServiceSubscription(args: {
  membershipId: string;
  customerAccountId: string;
}): Promise<{ ok: true } | { error: string }> {
  const membership = await prisma.membership.findUnique({
    where: { id: args.membershipId },
    include: { tenant: true },
  });
  if (!membership || membership.customerAccountId !== args.customerAccountId) {
    return { error: 'Assinatura não encontrada' };
  }
  await cancelMembershipCore(membership);
  return { ok: true };
}

/** Cancelamento pelo DONO (painel). Trava por tenantId (ownership do estabelecimento). */
export async function cancelMembershipByOwner(args: {
  membershipId: string;
  tenantId: string;
}): Promise<{ ok: true } | { error: string }> {
  const membership = await prisma.membership.findFirst({
    where: { id: args.membershipId, tenantId: args.tenantId },
    include: { tenant: true },
  });
  if (!membership) return { error: 'Assinatura não encontrada' };
  await cancelMembershipCore(membership);
  return { ok: true };
}
