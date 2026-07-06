'use server';

import { prisma } from '@haru/database';
import type { AddonTier, BillingCycle, PlanTier } from '@haru/database';
import {
  TIER_LABEL,
  isAddonActive,
  isSubscriptionActive,
  recurringValueCents,
  snapshotAddon,
  snapshotPlan,
} from '@haru/billing';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth';
import { demandaeWaLink, effectuateAddonActivation, nextCycleBase } from '@/lib/billing/addon';
import {
  BillingConfigError,
  cancelAsaasSubscription,
  cancelPendingChargeByReference,
  createCustomer,
  createInstallmentCharge,
  createOneTimeCharge,
  createSubscription,
  findLastPaidCharge,
  findPendingChargeByReference,
  getPendingInvoiceUrl,
  refundAsaasPayment,
  updateAsaasSubscription,
} from '@/lib/billing/asaas';
import { emailAddonActivated, emailSubscriptionCanceled } from '@/lib/billing/email';
import { isValidCpfCnpj, onlyDigits } from '@haru/shared';

export type CheckoutResult =
  | { error: string }
  /** Cartão: redireciona o cliente pra fatura hospedada do Asaas (digita o cartão lá). */
  | { ok: true; method: 'CARD'; checkoutUrl: string }
  /** Pix: mostra o QR; ativa quando o webhook confirmar o pagamento. */
  | { ok: true; method: 'PIX'; pixQrCode: string; pixCopyPaste: string };

const schema = z.object({
  tier: z.enum(['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE']),
  cycle: z.enum(['MONTHLY', 'ANNUAL', 'ANNUAL_INSTALLMENTS']),
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
  // Valor do ciclo escolhido: mensal, anual à vista, ou valor de CADA parcela do 12x.
  const amountCents = snapshot.priceCents;
  if (amountCents <= 0) {
    return { error: 'Este ciclo de cobrança não está disponível para este plano.' };
  }

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

    // Re-contratação: cancela a assinatura Asaas anterior ANTES de criar outra, senão a
    // recorrência antiga fica órfã (segue gerando fatura) e a 1ª fatura antiga (plano +
    // setup) continua aberta/pagável - risco de cobrança em dobro. Tolerante a erro/404.
    if (tenant.subscription?.asaasSubscriptionId) {
      await cancelAsaasSubscription(tenant.subscription.asaasSubscriptionId).catch((err) =>
        console.error('[billing] falha ao cancelar assinatura Asaas anterior', err),
      );
    }

    // Anual 12x: NÃO é recorrência - é uma venda parcelada no cartão (installment). Sem
    // asaasSubscriptionId; o webhook reconcilia pela externalReference (= Subscription.id).
    // Só cartão (parcelamento não existe em Pix/boleto). Ativa quando o webhook confirmar.
    if (cycle === 'ANNUAL_INSTALLMENTS') {
      if (method !== 'CARD') {
        return { error: 'O parcelamento em 12x é só no cartão de crédito.' };
      }
      const installment = await createInstallmentCharge({
        customerId,
        installmentCount: 12,
        installmentCents: amountCents,
        description: `Demandaê ${plan.name} (anual 12x)`,
        externalReference: sub.id,
      });
      const now = new Date();
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          asaasSubscriptionId: null,
          status: 'PENDING',
          currentPeriodStart: now,
          currentPeriodEnd: addMonths(now, 12),
          guaranteeUntil: addDays(now, 30),
          canceledAt: null,
        },
      });
      revalidatePath('/assinatura');
      revalidatePath('/settings');
      if (!installment.invoiceUrl) {
        return { error: 'Não foi possível abrir o checkout do cartão. Tente novamente.' };
      }
      return { ok: true, method: 'CARD', checkoutUrl: installment.invoiceUrl };
    }

    const result = await createSubscription({
      customerId,
      amountCents,
      cycle: cycle as BillingCycle,
      method: method === 'CARD' ? 'CREDIT_CARD' : 'PIX',
      description: `Demandaê ${plan.name} (${cycle === 'ANNUAL' ? 'anual' : 'mensal'})`,
      externalReference: sub.id,
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

/** `scheduled` = a mudança não vale agora e sim no próximo ciclo (downgrade). */
export type ManageResult = { error: string } | { ok: true; scheduled?: boolean };

/**
 * Cancela a assinatura. Para as cobranças futuras no Asaas e marca CANCELED. Dentro dos
 * 30 dias de garantia (`guaranteeUntil` no futuro): estorna a última cobrança paga
 * (reembolso integral automático) e encerra o acesso agora. Fora da garantia: sem
 * estorno, o acesso segue até `currentPeriodEnd` (o que já foi pago) - ver
 * isSubscriptionActive. `reason` é feedback opcional do dono.
 */
export async function cancelSubscription(reason?: string): Promise<ManageResult> {
  const { tenant } = await requireAdmin();
  const sub = tenant.subscription;
  if (!sub) return { error: 'Você não tem uma assinatura para cancelar.' };

  const withinGuarantee = sub.guaranteeUntil != null && sub.guaranteeUntil.getTime() > Date.now();

  try {
    if (withinGuarantee) {
      // Garantia: estorna a última cobrança paga. Recorrência → busca no Asaas; anual 12x
      // (installment, sem asaasSubscriptionId) → estorna o pagamento registrado em
      // lastBilledPaymentId. Tolerante a falha (nada pago ainda, já estornado) - o
      // cancelamento nunca trava por causa do estorno.
      const paymentId = sub.asaasSubscriptionId
        ? await findLastPaidCharge(sub.asaasSubscriptionId).catch(() => null)
        : sub.lastBilledPaymentId;
      if (paymentId) {
        await refundAsaasPayment(paymentId).catch((err) =>
          console.error('[billing] estorno na garantia falhou', err),
        );
      }
    }
    if (sub.asaasSubscriptionId) {
      await cancelAsaasSubscription(sub.asaasSubscriptionId);
    }
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        canceledReason: reason?.trim() ? reason.trim().slice(0, 500) : null,
        // Reembolsou (garantia) → encerra o acesso agora; senão mantém até o fim do
        // período já pago.
        ...(withinGuarantee ? { currentPeriodEnd: new Date() } : {}),
        // Cancelar limpa qualquer downgrade agendado.
        pendingPlanTier: null,
        pendingBillingCycle: null,
      },
    });
    // Avisa o dono, com o detalhe do cenário: reembolso (dentro da garantia) vs fim de ciclo.
    emailSubscriptionCanceled(
      tenant.id,
      withinGuarantee ? 'refund' : 'end_of_cycle',
      withinGuarantee ? {} : { accessUntil: sub.currentPeriodEnd },
    ).catch((err) => console.error('[billing] email cancelamento falhou', err));
    revalidatePath('/assinatura');
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    console.error('[billing] cancel falhou', err);
    return { error: 'Não foi possível cancelar agora. Tente novamente.' };
  }
}

/**
 * Desativa o addon "Atendente IA no WhatsApp". Vale no fim do ciclo pago: marca
 * `addonCanceledAt`, mas o bot segue atendendo até `currentPeriodEnd` (ver isAddonActive);
 * o webhook de renovação zera o snapshot do addon quando o ciclo vira. Reescreve a
 * recorrência Asaas com só o plano base a partir da PRÓXIMA cobrança (updatePendingPayments
 * = false: o ciclo atual, já pago com o addon, fica intacto).
 */
export async function deactivateAddon(): Promise<ManageResult> {
  const { tenant } = await requireAdmin();
  const sub = tenant.subscription;
  // Só desativa addon de fato ATIVO. addonActivatedAt == null = ainda no limbo (escolhido/
  // aguardando setup ou verificação) - não há nada "ativo" pra agendar cancelamento.
  if (!sub || sub.addonActivatedAt == null || sub.addonCanceledAt != null) {
    return { error: 'Você não tem o Atendente IA ativo para desativar.' };
  }
  try {
    if (sub.asaasSubscriptionId) {
      // Base do PRÓXIMO ciclo (considera downgrade agendado) SEM o addon.
      const base = await nextCycleBase(sub);
      await updateAsaasSubscription(sub.asaasSubscriptionId, {
        amountCents: base.cents,
        cycle: base.cycle,
        description: `Demandaê ${TIER_LABEL[sub.planTier]}`,
        updatePendingPayments: false,
      });
    }
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { addonCanceledAt: new Date() },
    });
    revalidatePath('/assinatura');
    revalidatePath('/settings');
    return { ok: true, scheduled: true };
  } catch (err) {
    console.error('[billing] deactivateAddon falhou', err);
    return { error: 'Não foi possível desativar agora. Tente novamente.' };
  }
}

export type ActivateAddonResult =
  | { error: string }
  | {
      ok: true;
      channel: 'DEMANDAE' | 'OWN';
      /** Fatura hospedada a pagar: setup (OWN) ou proporcional (DEMANDAE). null = nada agora. */
      invoiceUrl: string | null;
      /** Link wa.me pra compartilhar com os clientes (só DEMANDAE). */
      waLink: string | null;
    };

const activateAddonSchema = z.object({
  addonTier: z.enum(['BOT_SOLO', 'BOT_TIME', 'BOT_MULTI']),
  channel: z.enum(['DEMANDAE', 'OWN']),
  botDisplayName: z.string().trim().max(80).optional(),
  botTone: z.string().trim().max(200).optional(),
  botGreeting: z.string().trim().max(500).optional(),
});

/**
 * Ativa o addon "Atendente IA no WhatsApp". Duas variantes:
 * - DEMANDAE (número compartilhado): sem setup, ativa NA HORA - soma o addon à recorrência,
 *   cobra o proporcional do 1º ciclo e devolve o link wa.me pra compartilhar.
 * - OWN (número próprio): cobra o setup R$1.497 ANTES de qualquer config técnica e NÃO ativa;
 *   o webhook do setup avisa o operador, que conclui a WABA e ativa pelo app admin.
 * Em ambas grava o snapshot do addon (grandfather) + a identidade que o bot usa pra se
 * apresentar. O ciclo do addon acompanha o do plano base. Reentrante enquanto não ativado.
 */
export async function activateAddon(
  _prev: ActivateAddonResult | undefined,
  formData: FormData,
): Promise<ActivateAddonResult> {
  const { tenant } = await requireAdmin();
  const sub = tenant.subscription;
  if (!isSubscriptionActive(sub) || !sub) {
    return { error: 'Você precisa de uma assinatura ativa para contratar o Atendente IA.' };
  }
  if (sub.addonActivatedAt != null) {
    return { error: 'O Atendente IA já está ativo.' };
  }
  // Re-entrada no limbo do número próprio (setup JÁ pago, aguardando o operador ativar): NÃO
  // reprocessa. Sem este guard, o update lá embaixo zeraria addonSetupChargedAt e, como a
  // cobrança do setup já está paga (status não-PENDING), findPendingChargeByReference não a
  // acharia e uma SEGUNDA cobrança de R$1.497 seria criada. Devolve o estado atual (a UI já
  // mostra "aguardando verificação").
  if (sub.addonChannel === 'OWN' && sub.addonSetupChargedAt != null) {
    return { ok: true, channel: 'OWN', invoiceUrl: null, waLink: null };
  }
  if (!sub.asaasCustomerId) {
    return {
      error:
        'Sua assinatura não tem forma de pagamento para cobrar o Atendente IA. Fale com o suporte.',
    };
  }

  const parsed = activateAddonSchema.safeParse({
    addonTier: formData.get('addonTier'),
    channel: formData.get('channel'),
    botDisplayName: formData.get('botDisplayName') || undefined,
    botTone: formData.get('botTone') || undefined,
    botGreeting: formData.get('botGreeting') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  const { addonTier, channel, botDisplayName, botTone, botGreeting } = parsed.data;

  const addon = await prisma.addonPlan.findUnique({ where: { tier: addonTier as AddonTier } });
  if (!addon || !addon.active) return { error: 'Plano do Atendente IA indisponível.' };

  const cycle = sub.billingCycle; // o addon acompanha o ciclo do plano base
  const addonSnap = snapshotAddon(addon, cycle);
  const identity = {
    botDisplayName: botDisplayName || null,
    botTone: botTone || null,
    botGreeting: botGreeting || null,
  };

  try {
    // Trocou de canal deixando um setup OWN pendente (ainda não pago) pra trás? Cancela a
    // cobrança órfã pra o cliente não pagar por engano por um setup que não vai mais acontecer.
    if (sub.addonChannel === 'OWN' && channel !== 'OWN' && sub.addonSetupChargedAt == null) {
      await cancelPendingChargeByReference(`addon-setup:${sub.id}`).catch((err) =>
        console.error('[billing] cancelar setup órfão falhou', err),
      );
    }
    // Grava a escolha + snapshot (grandfather) + identidade. NÃO ativa ainda (addonActivatedAt
    // só é setado quando efetivamos - na hora p/ DEMANDAE, pelo operador p/ OWN).
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        addonTier: addonTier as AddonTier,
        addonChannel: channel,
        addonBillingCycle: cycle,
        ...addonSnap,
        addonSetupChargedAt: null,
        addonActivatedAt: null,
        addonCanceledAt: null,
      },
    });
    await prisma.tenant.update({ where: { id: tenant.id }, data: identity });

    if (channel === 'OWN') {
      // Setup cobrado ANTES de qualquer config técnica. Idempotente: reusa cobrança pendente
      // de mesma referência (o cliente pode reabrir a tela sem gerar cobrança dupla).
      const ref = `addon-setup:${sub.id}`;
      const existing = await findPendingChargeByReference(ref).catch(() => null);
      const charge =
        existing ??
        (await createOneTimeCharge({
          customerId: sub.asaasCustomerId,
          amountCents: addonSnap.addonSetupFeeCents,
          description: `Demandaê - setup do Atendente IA (${addon.name})`,
          externalReference: ref,
        }));
      revalidatePath('/assinatura');
      return { ok: true, channel: 'OWN', invoiceUrl: charge.invoiceUrl, waLink: null };
    }

    // DEMANDAE: ativa na hora (soma recorrência + proporcional).
    const fresh = await prisma.subscription.findUnique({ where: { id: sub.id } });
    if (!fresh) return { error: 'Não foi possível ativar agora. Tente novamente.' };
    const { invoiceUrl } = await effectuateAddonActivation(fresh);
    const waLink = demandaeWaLink(tenant.slug);
    emailAddonActivated(tenant.id, { channel: 'DEMANDAE', waLink }).catch((err) =>
      console.error('[billing] email ativação addon (demandae) falhou', err),
    );
    revalidatePath('/assinatura');
    revalidatePath('/settings');
    return { ok: true, channel: 'DEMANDAE', invoiceUrl, waLink };
  } catch (err) {
    if (err instanceof BillingConfigError) {
      console.error('[billing] activateAddon config', err);
      return { error: 'Cobrança indisponível no momento. Tente mais tarde.' };
    }
    console.error('[billing] activateAddon falhou', err);
    return { error: 'Não foi possível ativar o Atendente IA agora. Tente novamente.' };
  }
}

const changePlanSchema = z.object({
  tier: z.enum(['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE']),
  cycle: z.enum(['MONTHLY', 'ANNUAL']),
});

/**
 * Troca o plano/ciclo da assinatura existente (atualiza a subscription no Asaas em vez de
 * criar outra). A DIREÇÃO define o momento:
 * - UPGRADE (mensalidade-alvo maior, ou mesmo plano): vale JÁ. Grava o snapshot novo
 *   (limites/features imediatos) e reescreve a cobrança em aberto no Asaas.
 * - DOWNGRADE (mensalidade-alvo menor): NÃO é retroativo. Mantém o snapshot atual até o
 *   fim do período pago e só AGENDA o novo plano (pendingPlanTier); o webhook de
 *   renovação aplica o snapshot no próximo ciclo. No Asaas o novo valor entra só da
 *   próxima cobrança em diante (updatePendingPayments=false).
 * Comparação por `priceMonthlyCents` (ranking canônico dos tiers), independente do ciclo.
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

  const [plan, currentPlan] = await Promise.all([
    prisma.plan.findUnique({ where: { tier: tier as PlanTier } }),
    prisma.plan.findUnique({ where: { tier: sub.planTier } }),
  ]);
  if (!plan || !plan.active || plan.priceMonthlyCents <= 0) {
    return { error: 'Plano indisponível para troca self-service.' };
  }

  const isDowngrade = currentPlan != null && plan.priceMonthlyCents < currentPlan.priceMonthlyCents;
  const snapshot = snapshotPlan(plan, cycle as BillingCycle);
  const planAmount = cycle === 'ANNUAL' ? plan.priceAnnualCents : plan.priceMonthlyCents;
  // Mantém o addon no valor recorrente: sem somá-lo aqui, trocar de plano reescreveria o
  // `value` do Asaas só com o plano e o addon sumiria da conta. ponytail: usa o snapshot
  // atual do addon; se a troca também mudar o CICLO base, o addon segue com o preço do ciclo
  // em que foi contratado (raro - refinar se virar caso real). `addonCanceledAt == null`:
  // não re-inclui um addon já em desativação agendada (ele segue "ativo" até o fim do ciclo,
  // mas não deve voltar pra recorrência do próximo ciclo só porque o plano mudou).
  const addonAmount =
    isAddonActive(sub) && sub.addonCanceledAt == null ? (sub.addonPriceCents ?? 0) : 0;
  const amountCents = planAmount + addonAmount;
  const description =
    `Demandaê ${plan.name} (${cycle === 'ANNUAL' ? 'anual' : 'mensal'})` +
    (addonAmount > 0 ? ' + Atendente IA' : '');

  try {
    await updateAsaasSubscription(sub.asaasSubscriptionId, {
      amountCents,
      cycle: cycle as BillingCycle,
      description,
      // Downgrade não mexe na cobrança já emitida deste ciclo.
      updatePendingPayments: !isDowngrade,
    });

    if (isDowngrade) {
      // Agenda a troca; snapshot atual segue valendo até a renovação (webhook aplica).
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { pendingPlanTier: tier as PlanTier, pendingBillingCycle: cycle as BillingCycle },
      });
    } else {
      // Upgrade / mesmo plano: aplica já e limpa qualquer downgrade antes agendado.
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          planTier: tier as PlanTier,
          billingCycle: cycle as BillingCycle,
          ...snapshot,
          pendingPlanTier: null,
          pendingBillingCycle: null,
        },
      });
    }

    revalidatePath('/assinatura');
    revalidatePath('/settings');
    return { ok: true, scheduled: isDowngrade };
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
