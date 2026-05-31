import type { FunctionTool } from 'openai/resources/responses/responses';

import {
  bookAppointment,
  cancelAppointmentForContact,
  rescheduleAppointmentForContact,
} from '../../services/appointmentService.js';
import { saveCustomerProfile } from '../../services/contactService.js';
import { createPaymentForAppointment } from '../../services/paymentService.js';

export interface ToolContext {
  tenantId: string;
  contactId: string;
}

export const TOOLS: FunctionTool[] = [
  {
    type: 'function',
    name: 'save_customer_profile',
    description:
      'Salva o cadastro básico do cliente. Use ANTES de agendar pela primeira vez, depois de ' +
      'confirmar o nome e oferecer (sem insistir) email e data de nascimento. O telefone já é ' +
      'conhecido automaticamente — NÃO peça. Email e data de nascimento são OPCIONAIS: se o ' +
      'cliente não quiser informar, mande string vazia "" no campo.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nome do cliente (obrigatório). Confirme o nome do perfil antes de salvar.',
        },
        email: {
          type: 'string',
          description: 'Email do cliente, ou "" se não informado (opcional).',
        },
        birth_date: {
          type: 'string',
          description:
            'Data de nascimento no formato YYYY-MM-DD (ex: 1990-07-25), ou "" se não informada ' +
            '(opcional).',
        },
      },
      required: ['name', 'email', 'birth_date'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'book_appointment',
    description:
      'Cria um agendamento confirmado para o cliente. Use APENAS depois de o cliente ter ' +
      'confirmado explicitamente o serviço e o horário.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        service_id: {
          type: 'string',
          description:
            'ID do serviço (vide o [srv_...] que aparece na lista de serviços do estabelecimento)',
        },
        starts_at: {
          type: 'string',
          description:
            'Data/hora de início no formato ISO 8601 com offset do fuso do estabelecimento, ' +
            'ex: 2026-05-28T14:00:00-03:00',
        },
      },
      required: ['service_id', 'starts_at'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'create_payment',
    description:
      'Gera uma cobrança (Pix copia-e-cola ou link de cartão) para um agendamento do PRÓPRIO ' +
      'cliente. Use SÓ depois de book_appointment ter dado certo e o cliente ter escolhido pagar ' +
      'agora e o meio. Pagamento é OPCIONAL — nunca force. Se o resultado vier com ' +
      '"needs_document": true, peça o CPF ao cliente e chame de novo passando-o em `document`.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description:
            'ID do agendamento recém-criado (o `appointment_id` retornado por book_appointment).',
        },
        method: {
          type: 'string',
          enum: ['PIX', 'CREDIT_CARD'],
          description: 'Meio escolhido pelo cliente: PIX (copia-e-cola) ou CREDIT_CARD (link).',
        },
        document: {
          type: 'string',
          description:
            'CPF/CNPJ do cliente (só quando o passo anterior pediu via needs_document), ou "" se ' +
            'já tivermos o documento salvo.',
        },
      },
      required: ['appointment_id', 'method', 'document'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'cancel_appointment',
    description:
      'Cancela um agendamento futuro do PRÓPRIO cliente. Use APENAS depois do cliente ter ' +
      'confirmado o cancelamento. O ID vem da seção "Seus agendamentos" no contexto.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'ID do agendamento (vide o [apt_...] em "Seus agendamentos")',
        },
      },
      required: ['appointment_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'reschedule_appointment',
    description:
      'Move um agendamento futuro do PRÓPRIO cliente para um novo horário. Mantém o mesmo ' +
      'serviço/duração. Use APENAS depois do cliente confirmar o novo horário.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'ID do agendamento atual (vide o [apt_...] em "Seus agendamentos")',
        },
        new_starts_at: {
          type: 'string',
          description:
            'Nova data/hora de início no formato ISO 8601 com offset do fuso do estabelecimento, ' +
            'ex: 2026-05-28T14:00:00-03:00. Tem que estar dentro dos horários de atendimento ' +
            'e sem conflito com outros agendamentos.',
        },
      },
      required: ['appointment_id', 'new_starts_at'],
      additionalProperties: false,
    },
  },
];

export async function executeTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (name === 'save_customer_profile') {
    const result = await saveCustomerProfile({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      name: String(args.name ?? ''),
      email: String(args.email ?? ''),
      birthDate: String(args.birth_date ?? ''),
    });
    return JSON.stringify(result);
  }

  if (name === 'book_appointment') {
    const result = await bookAppointment({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      serviceId: String(args.service_id ?? ''),
      startsAtIso: String(args.starts_at ?? ''),
    });
    return JSON.stringify(result);
  }

  if (name === 'create_payment') {
    const method = String(args.method ?? '');
    const result = await createPaymentForAppointment({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      appointmentId: String(args.appointment_id ?? ''),
      method: method === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX',
      document: String(args.document ?? ''),
    });
    // Renomeia needsDocument → needs_document pra ficar no estilo dos outros payloads ao LLM.
    if (!result.ok) {
      return JSON.stringify({
        ok: false,
        reason: result.reason,
        needs_document: result.needsDocument ?? false,
      });
    }
    return JSON.stringify(result);
  }

  if (name === 'cancel_appointment') {
    const result = await cancelAppointmentForContact({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      appointmentId: String(args.appointment_id ?? ''),
    });
    return JSON.stringify(result);
  }

  if (name === 'reschedule_appointment') {
    const result = await rescheduleAppointmentForContact({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      appointmentId: String(args.appointment_id ?? ''),
      newStartsAtIso: String(args.new_starts_at ?? ''),
    });
    return JSON.stringify(result);
  }

  return JSON.stringify({ ok: false, reason: `tool desconhecida: ${name}` });
}
