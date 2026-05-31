'use server';

import { type PaymentMethod, prisma } from '@haru/database';

import { getGatewayForTenant } from '@/lib/payments/factory';
import { GatewayNotImplementedError, PaymentConfigError } from '@/lib/payments/types';

export type CreatePaymentResult =
  | { error: string }
  | {
      ok: true;
      method: PaymentMethod;
      checkoutUrl: string | null;
      pixQrCode: string | null;
      pixCopyPaste: string | null;
    };

/**
 * Cria (ou reaproveita) uma cobrança para um agendamento, a partir da tela de sucesso
 * do agendamento público. Rota pública (cliente sem login): toda a confiança vem da
 * validação server-side — exigimos que o appointment exista, pertença ao tenant do
 * `slug`, esteja em status pagável e que o tenant tenha gateway configurado.
 *
 * O pagamento é OPCIONAL e NÃO altera o status do Appointment.
 */
export async function createPaymentForAppointment(
  slug: string,
  appointmentId: string,
  method: 'PIX' | 'CREDIT_CARD',
): Promise<CreatePaymentResult> {
  if (method !== 'PIX' && method !== 'CREDIT_CARD') {
    return { error: 'Meio de pagamento inválido' };
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { tenant: true, service: true, contact: true },
  });

  // Vincula ao slug público pra impedir enumerar appointments de outro tenant.
  if (!appointment || appointment.tenant.slug !== slug) {
    return { error: 'Agendamento não encontrado' };
  }
  if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
    return { error: 'Este agendamento não está disponível para pagamento' };
  }
  if (appointment.service.priceCents <= 0) {
    return { error: 'Este serviço não tem cobrança' };
  }
  const { tenant } = appointment;
  if (!tenant.paymentProvider) {
    return { error: 'Pagamento online indisponível no momento' };
  }

  const wantedMethod: PaymentMethod = method;

  // Idempotência: reaproveita uma cobrança PENDING ainda válida do mesmo método.
  const now = new Date();
  const existing = await prisma.payment.findFirst({
    where: {
      appointmentId: appointment.id,
      status: 'PENDING',
      method: wantedMethod,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: 'desc' },
  });
  if (existing && existing.externalId) {
    return {
      ok: true,
      method: existing.method,
      checkoutUrl: existing.checkoutUrl,
      pixQrCode: existing.pixQrCode,
      pixCopyPaste: existing.pixCopyPaste,
    };
  }

  // Cria o registro local primeiro: o id vira `externalReference` no gateway, que volta
  // no webhook pra reconciliar.
  const payment =
    existing ??
    (await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        appointmentId: appointment.id,
        provider: tenant.paymentProvider,
        method: wantedMethod,
        status: 'PENDING',
        amountCents: appointment.service.priceCents,
      },
    }));

  const when = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tenant.timezone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(appointment.startsAt);

  try {
    const gateway = getGatewayForTenant(tenant);
    const charge = await gateway.createCharge({
      amountCents: payment.amountCents,
      description: `${appointment.service.name} · ${when}`,
      method: wantedMethod,
      externalReference: payment.id,
      customer: {
        name: appointment.contact.name ?? 'Cliente',
        phoneE164: appointment.contact.phone,
        email: appointment.contact.email,
      },
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalId: charge.externalId,
        checkoutUrl: charge.checkoutUrl,
        pixQrCode: charge.pixQrCode,
        pixCopyPaste: charge.pixCopyPaste,
        expiresAt: charge.expiresAt,
        status: charge.status === 'PAID' ? 'PAID' : charge.status === 'FAILED' ? 'FAILED' : 'PENDING',
        paidAt: charge.status === 'PAID' ? new Date() : null,
      },
    });

    return {
      ok: true,
      method: updated.method,
      checkoutUrl: updated.checkoutUrl,
      pixQrCode: updated.pixQrCode,
      pixCopyPaste: updated.pixCopyPaste,
    };
  } catch (err) {
    if (err instanceof GatewayNotImplementedError) {
      return { error: 'Este meio de pagamento ainda não está disponível.' };
    }
    if (err instanceof PaymentConfigError) {
      return { error: 'Pagamento online indisponível no momento' };
    }
    console.error('[payments] criar cobrança falhou', err);
    return { error: 'Não foi possível gerar a cobrança. Tente novamente.' };
  }
}
