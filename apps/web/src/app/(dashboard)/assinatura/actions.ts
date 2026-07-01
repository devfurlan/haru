'use server';

import { prisma } from '@haru/database';
import type { BillingCycle, PlanTier } from '@haru/database';
import { snapshotPlan } from '@haru/billing';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth';
import {
  BillingConfigError,
  cancelAsaasSubscription,
  createCustomer,
  createSubscription,
  getPendingInvoiceUrl,
  updateAsaasSubscription,
} from '@/lib/billing/asaas';
import { SETUP_FEE_CENTS } from '@/lib/billing/pricing';
import { isValidCpfCnpj, onlyDigits } from '@haru/shared';

export type CheckoutResult =
  | { error: string }
  /** Cartão: redireciona o cliente pra fatura hospedada do Asaas (digita o cartão lá). */
  | { ok: true; method: 'CARD'; checkoutUrl: string }
  /** Pix: mostra o QR; ativa quando o webhook confirmar o pagamento. */
  | { ok: true; method: 'PIX'; pixQrCode: string; pixCopyPaste: string };

const schema = z.object({
  tier: z.enum(['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE']),
  cycle: z.enum(['MONTHLY', 'ANNUAL']),
  method: z.enum(['CARD', 'PIX']),
  cpfCnpj: z.string().transform(onlyDigits).refine(isValidCpfCnpj, 'CPF/CNPJ inválido'),
});

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Contrata/troca a assinatura do SaaS via Asaas. Cartão → débito recorrente após o
 * cliente digitar o cartão na fatura hospedada do Asaas (cartão não passa pelo nosso
 * servidor). Pix → um Pix por ciclo (retorna o QR da 1ª cobrança). Grava o SNAPSHOT dos
 * termos do Plan vigente na Subscription (grandfather). Status fica PENDING até o webhook
 * confirmar o pagamento.
 */
export async function subscribe(
  _prev: CheckoutResult | undefined,
  formData: FormData,
): Promise<CheckoutResult> {
  const { tenant, email } = await requireAdmin();

  const parsed = schema.safeParse({
    tier: formData.get('tier'),
    cycle: formData.get('cycle'),
    method: formData.get('method'),
    cpfCnpj: formData.get('cpfCnpj'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { tier, cycle, method, cpfCnpj } = parsed.data;

  const plan = await prisma.plan.findUnique({ where: { tier: tier as PlanTier } });
  if (!plan || !plan.active) {
    return { error: 'Plano indisponível.' };
  }
  if (plan.priceMonthlyCents <= 0) {
    return { error: 'Este plano é sob consulta. Fale com a gente para contratar.' };
  }

  const snapshot = snapshotPlan(plan, cycle as BillingCycle);
  const amountCents = cycle === 'ANNUAL' ? plan.priceAnnualCents : plan.priceMonthlyCents;

  // Setup único (config. assistida do WhatsApp): só na 1ª contratação MENSAL. Grátis no
  // anual; quem já ativou antes (ativo/cancelado após pagar) não paga de novo - só quem
  // nunca ativou (sem assinatura ou ainda PENDING). ponytail: heurística por status,
  // sem coluna "setupPago"; refinar só se o fluxo de re-assinatura exigir.
  const existing = tenant.subscription;
  const chargeSetup = cycle === 'MONTHLY' && (!existing || existing.status === 'PENDING');

  try {
    // Reusa o customer do Asaas se já existir; senão cria.
    const customerId =
      tenant.subscription?.asaasCustomerId ??
      (await createCustomer({
        name: tenant.name,
        cpfCnpj,
        email,
        phoneE164: tenant.whatsappDisplayPhone ?? null,
        externalReference: tenant.id,
      }));

    // O Subscription.id é o externalReference no Asaas - precisa existir antes da chamada.
    // Garante a linha (PENDING) e reaproveita em re-tentativas.
    const sub = await prisma.subscription.upsert({
      where: { tenantId: tenant.id },
      update: {
        planTier: tier as PlanTier,
        billingCycle: cycle as BillingCycle,
        asaasCustomerId: customerId,
        ...snapshot,
      },
      create: {
        tenantId: tenant.id,
        planTier: tier as PlanTier,
        status: 'PENDING',
        billingCycle: cycle as BillingCycle,
        asaasCustomerId: customerId,
        ...snapshot,
      },
    });

    const result = await createSubscription({
      customerId,
      amountCents,
      cycle: cycle as BillingCycle,
      method: method === 'CARD' ? 'CREDIT_CARD' : 'PIX',
      description: `Demandaê ${plan.name} (${cycle === 'ANNUAL' ? 'anual' : 'mensal'})`,
      externalReference: sub.id,
      setupFeeCents: chargeSetup ? SETUP_FEE_CENTS : 0,
    });

    const now = new Date();
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        asaasSubscriptionId: result.asaasSubscriptionId,
        // PENDING até o webhook confirmar (cartão é digitado na fatura hospedada do Asaas;
        // Pix aguarda o pagamento). currentPeriodEnd é ajustado no webhook ao confirmar.
        status: 'PENDING',
        currentPeriodStart: now,
        currentPeriodEnd: cycle === 'ANNUAL' ? addMonths(now, 12) : addMonths(now, 1),
        guaranteeUntil: addDays(now, 30),
        canceledAt: null,
      },
    });

    revalidatePath('/assinatura');
    revalidatePath('/settings');

    if (method === 'CARD') {
      if (!result.firstPayment?.invoiceUrl) {
        return { error: 'Não foi possível abrir o checkout do cartão. Tente novamente.' };
      }
      return { ok: true, method: 'CARD', checkoutUrl: result.firstPayment.invoiceUrl };
    }

    if (!result.firstPayment?.pix) {
      return { error: 'Não foi possível gerar o Pix. Tente novamente.' };
    }
    return {
      ok: true,
      method: 'PIX',
      pixQrCode: result.firstPayment.pix.qrCode,
      pixCopyPaste: result.firstPayment.pix.copyPaste,
    };
  } catch (err) {
    if (err instanceof BillingConfigError) {
      console.error('[billing] config', err);
      return { error: 'Cobrança indisponível no momento. Tente mais tarde.' };
    }
    console.error('[billing] subscribe falhou', err);
    return { error: 'Não foi possível concluir a contratação. Confira os dados e tente de novo.' };
  }
}

// --- Gestão da assinatura (self-service) ------------------------------------

export type ManageResult = { error: string } | { ok: true };

/**
 * Cancela a assinatura. Para as cobranças futuras no Asaas e marca CANCELED, mas o
 * acesso continua até `currentPeriodEnd` (o que ele já pagou) - ver isSubscriptionActive.
 */
export async function cancelSubscription(): Promise<ManageResult> {
  const { tenant } = await requireAdmin();
  const sub = tenant.subscription;
  if (!sub) return { error: 'Você não tem uma assinatura para cancelar.' };

  try {
    if (sub.asaasSubscriptionId) {
      await cancelAsaasSubscription(sub.asaasSubscriptionId);
    }
    // Mantém currentPeriodEnd: acesso segue até o fim do período pago.
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
    revalidatePath('/assinatura');
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    console.error('[billing] cancel falhou', err);
    return { error: 'Não foi possível cancelar agora. Tente novamente.' };
  }
}

const changePlanSchema = z.object({
  tier: z.enum(['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE']),
  cycle: z.enum(['MONTHLY', 'ANNUAL']),
});

/**
 * Troca o plano/ciclo da assinatura existente (atualiza a subscription no Asaas em vez
 * de criar outra). Sem proração: limites/features mudam já (snapshot), o novo valor vale
 * a partir do próximo ciclo.
 */
export async function changePlan(
  _prev: ManageResult | undefined,
  formData: FormData,
): Promise<ManageResult> {
  const { tenant } = await requireAdmin();
  const sub = tenant.subscription;
  if (!sub?.asaasSubscriptionId || sub.status !== 'ACTIVE') {
    return { error: 'Você precisa de uma assinatura ativa para trocar de plano.' };
  }

  const parsed = changePlanSchema.safeParse({
    tier: formData.get('tier'),
    cycle: formData.get('cycle'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  const { tier, cycle } = parsed.data;

  const plan = await prisma.plan.findUnique({ where: { tier: tier as PlanTier } });
  if (!plan || !plan.active || plan.priceMonthlyCents <= 0) {
    return { error: 'Plano indisponível para troca self-service.' };
  }

  const snapshot = snapshotPlan(plan, cycle as BillingCycle);
  const amountCents = cycle === 'ANNUAL' ? plan.priceAnnualCents : plan.priceMonthlyCents;

  try {
    await updateAsaasSubscription(sub.asaasSubscriptionId, {
      amountCents,
      cycle: cycle as BillingCycle,
      description: `Demandaê ${plan.name} (${cycle === 'ANNUAL' ? 'anual' : 'mensal'})`,
    });
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { planTier: tier as PlanTier, billingCycle: cycle as BillingCycle, ...snapshot },
    });
    revalidatePath('/assinatura');
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    console.error('[billing] changePlan falhou', err);
    return { error: 'Não foi possível trocar o plano agora. Tente novamente.' };
  }
}

export type UpdateCardResult = { error: string } | { ok: true; redirectUrl: string };

/**
 * Atualizar cartão: leva o cliente à fatura hospedada da cobrança pendente, onde o
 * Asaas permite informar um novo cartão (o cartão não passa pelo nosso servidor).
 */
export async function updateCard(): Promise<UpdateCardResult> {
  const { tenant } = await requireAdmin();
  const sub = tenant.subscription;
  if (!sub?.asaasSubscriptionId) return { error: 'Nenhuma assinatura ativa.' };

  try {
    const url = await getPendingInvoiceUrl(sub.asaasSubscriptionId);
    if (!url) {
      return { error: 'Não há cobrança pendente para atualizar o cartão agora.' };
    }
    return { ok: true, redirectUrl: url };
  } catch (err) {
    console.error('[billing] updateCard falhou', err);
    return { error: 'Não foi possível abrir a atualização do cartão. Tente novamente.' };
  }
}
