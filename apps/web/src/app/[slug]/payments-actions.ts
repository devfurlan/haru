'use server';

import { type PaymentMethod, prisma } from '@haru/database';
import { hasFeature } from '@haru/billing';
import {
  decryptNullable,
  encryptSecret,
  getGatewayForTenant,
  GatewayNotImplementedError,
  PaymentConfigError,
} from '@haru/payments';

import { isValidCpfCnpj, onlyDigits } from '@haru/shared';

export type CreatePaymentResult =
  | { error: string; needsDocument?: boolean }
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
 * validação server-side - exigimos que o appointment exista, pertença ao tenant do
 * `slug`, esteja em status pagável e que o tenant tenha gateway configurado.
 *
 * O pagamento é OPCIONAL e NÃO altera o status do Appointment.
 */
export async function createPaymentForAppointment(
  slug: string,
  appointmentId: string,
  method: 'PIX' | 'CREDIT_CARD',
  /** CPF/CNPJ do pagador (com ou sem máscara). O Asaas exige documento pra emitir Pix. */
  document?: string,
  /**
   * Conta do cliente autenticado (app mobile), quando houver. Usada para checar posse do
   * agendamento e liberar a persistência do CPF no cadastro. No fluxo público da web
   * (cliente sem login) vem `null`/undefined - aí a cobrança é gerada mas o CPF NÃO é
   * gravado no contato (evita sobrescrever PII de terceiro só conhecendo o appointmentId).
   */
  authCustomerAccountId?: string | null,
): Promise<CreatePaymentResult> {
  if (method !== 'PIX' && method !== 'CREDIT_CARD') {
    return { error: 'Meio de pagamento inválido' };
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { tenant: { include: { subscription: true } }, service: true, contact: true },
  });

  // Vincula ao slug público pra impedir enumerar appointments de outro tenant.
  if (!appointment || appointment.tenant.slug !== slug) {
    return { error: 'Agendamento não encontrado' };
  }

  // Fluxo autenticado (app mobile): o agendamento não pode pertencer a OUTRA conta. Contato
  // ainda não vinculado a nenhuma conta é permitido (caso de agendar com outro telefone).
  if (
    authCustomerAccountId &&
    appointment.contact.customerAccountId &&
    appointment.contact.customerAccountId !== authCustomerAccountId
  ) {
    return { error: 'Agendamento não encontrado' };
  }
  if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
    return { error: 'Este agendamento não está disponível para pagamento' };
  }
  if (appointment.service.priceCents <= 0) {
    return { error: 'Este serviço não tem cobrança' };
  }
  // Rede de segurança: agendamento coberto por crédito de assinatura NÃO gera cobrança (o
  // consumo do crédito já "pagou"). Impede cobrar duas vezes se a UI escapar do
  // paymentAvailable=false. Cobre o fluxo público E o mobile (ambos passam por aqui).
  if (appointment.membershipId) {
    return { error: 'Este agendamento está coberto pelo seu plano de assinatura' };
  }
  const { tenant } = appointment;
  // Gate de plano + provider configurado. Ambos resultam na mesma mensagem neutra ao
  // cliente final (não expõe detalhe de plano de quem não está pagando o tier certo).
  if (!tenant.paymentProvider || !hasFeature(tenant.subscription, 'onlinePayments')) {
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

  // Documento do pagador: o Asaas recusa a cobrança sem CPF/CNPJ do cliente. Reusa o
  // documento já salvo no contato; senão exige o do form. `needsDocument` sinaliza à UI
  // pra abrir o campo de CPF em vez de só mostrar o erro genérico.
  const documentDigits = document ? onlyDigits(document) : '';
  const savedDocument = decryptNullable(appointment.contact.document);
  const payerDocument = documentDigits || savedDocument || '';
  if (!payerDocument) {
    return { error: 'Pra gerar o pagamento, informe seu CPF.', needsDocument: true };
  }
  if (!isValidCpfCnpj(payerDocument)) {
    return { error: 'CPF inválido. Confira os números e tente de novo.', needsDocument: true };
  }
  // Cifrado at rest pra gravar no banco; o gateway recebe o valor em claro (`cpfCnpj`, abaixo).
  const payerDocumentEnc = encryptSecret(payerDocument);
  // Só persiste o CPF no cadastro quando o caller é o DONO comprovado do contato (app
  // autenticado). No fluxo público/anônimo, ou contato de outra conta, o documento é usado
  // só na cobrança e nunca gravado - senão qualquer um com o appointmentId sobrescreveria a
  // PII de um terceiro.
  const callerOwnsContact =
    !!authCustomerAccountId && appointment.contact.customerAccountId === authCustomerAccountId;
  if (callerOwnsContact && documentDigits && documentDigits !== savedDocument) {
    await prisma.contact.update({
      where: { id: appointment.contact.id },
      data: { document: payerDocumentEnc },
    });
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
        payerDocument: payerDocumentEnc,
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
        // Garante o snapshot mesmo quando reaproveitamos um Payment PENDING sem externalId.
        payerDocument: payerDocumentEnc,
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
