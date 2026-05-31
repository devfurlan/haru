import { type PaymentMethod } from '@haru/database';
import { getGatewayForTenant, GatewayNotImplementedError, PaymentConfigError } from '@haru/payments';

import { isValidCpfCnpj, onlyDigits } from '../lib/format.js';
import prisma from '../lib/prisma.js';

export interface CreatePaymentArgs {
  tenantId: string;
  contactId: string;
  appointmentId: string;
  method: 'PIX' | 'CREDIT_CARD';
  /** CPF/CNPJ informado pelo cliente no chat (com ou sem máscara). Opcional se o Contact já tem. */
  document?: string;
}

export type CreatePaymentResult =
  | {
      ok: true;
      method: PaymentMethod;
      amountCents: number;
      pixCopyPaste: string | null;
      checkoutUrl: string | null;
    }
  | { ok: false; reason: string; needsDocument?: boolean };

/**
 * Cria (ou reaproveita) uma cobrança para um agendamento, disparada pelo bot logo
 * após `book_appointment`. Espelha `createPaymentForAppointment` de
 * apps/web/src/app/[slug]/payments-actions.ts, mas:
 *  - escopo por (tenantId, contactId) em vez do slug público;
 *  - sem QR Code (o chat manda só o copia-e-cola + link de cartão);
 *  - quando falta o CPF, devolve `needsDocument` pro LLM pedir ao cliente.
 *
 * Pagamento é OPCIONAL e NÃO altera o status do Appointment.
 */
export async function createPaymentForAppointment(
  args: CreatePaymentArgs,
): Promise<CreatePaymentResult> {
  if (args.method !== 'PIX' && args.method !== 'CREDIT_CARD') {
    return { ok: false, reason: 'meio de pagamento inválido (use PIX ou CREDIT_CARD)' };
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: args.appointmentId, tenantId: args.tenantId, contactId: args.contactId },
    include: { tenant: true, service: true, contact: true },
  });

  if (!appointment) {
    return { ok: false, reason: 'agendamento não encontrado ou não pertence a este cliente' };
  }
  if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
    return { ok: false, reason: 'este agendamento não está disponível para pagamento' };
  }
  if (appointment.service.priceCents <= 0) {
    return { ok: false, reason: 'este serviço não tem cobrança' };
  }
  const { tenant } = appointment;
  if (!tenant.paymentProvider) {
    return { ok: false, reason: 'pagamento online não está habilitado neste estabelecimento' };
  }

  const wantedMethod: PaymentMethod = args.method;

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
      amountCents: existing.amountCents,
      pixCopyPaste: existing.pixCopyPaste,
      checkoutUrl: existing.checkoutUrl,
    };
  }

  // Documento do pagador: o Asaas recusa a cobrança sem CPF/CNPJ. Reusa o do contato;
  // senão pede ao cliente (needsDocument sinaliza ao LLM pra pedir o CPF no chat).
  const documentDigits = args.document ? onlyDigits(args.document) : '';
  const payerDocument = documentDigits || appointment.contact.document || '';
  if (!payerDocument) {
    return { ok: false, reason: 'preciso do CPF do cliente pra gerar o pagamento', needsDocument: true };
  }
  if (!isValidCpfCnpj(payerDocument)) {
    return { ok: false, reason: 'CPF inválido — peça os números de novo', needsDocument: true };
  }
  // Persiste no contato pra reuso (só quando veio um novo documento do chat).
  if (documentDigits && documentDigits !== appointment.contact.document) {
    await prisma.contact.update({
      where: { id: appointment.contact.id },
      data: { document: documentDigits },
    });
  }

  // Cria o registro local primeiro: o id vira `externalReference` no gateway, que
  // volta no webhook (recebido em apps/web) pra reconciliar.
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
        payerDocument,
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
        cpfCnpj: payerDocument,
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
        status:
          charge.status === 'PAID' ? 'PAID' : charge.status === 'FAILED' ? 'FAILED' : 'PENDING',
        paidAt: charge.status === 'PAID' ? new Date() : null,
        payerDocument,
      },
    });

    return {
      ok: true,
      method: updated.method,
      amountCents: updated.amountCents,
      pixCopyPaste: updated.pixCopyPaste,
      checkoutUrl: updated.checkoutUrl,
    };
  } catch (err) {
    if (err instanceof GatewayNotImplementedError) {
      return { ok: false, reason: 'este meio de pagamento ainda não está disponível' };
    }
    if (err instanceof PaymentConfigError) {
      return { ok: false, reason: 'pagamento online indisponível no momento' };
    }
    console.error('[payments] criar cobrança (bot) falhou', err);
    return { ok: false, reason: 'não consegui gerar a cobrança agora, tente de novo' };
  }
}
