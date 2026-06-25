import type { FunctionTool } from 'openai/resources/responses/responses';

import {
  bookAppointment,
  bookRecurringAppointment,
  cancelAppointmentForContact,
  cancelSeriesForContact,
  rescheduleAppointmentForContact,
} from '../../services/appointmentService.js';
import type { RecurrenceFrequency } from '../recurrence.js';
import { saveCustomerProfile } from '../../services/contactService.js';
import { initiateHandoff } from '../../services/handoffService.js';
import { createPaymentForAppointment } from '../../services/paymentService.js';

export interface ToolContext {
  tenantId: string;
  contactId: string;
  conversationId?: string;
}

export const TOOLS: FunctionTool[] = [
  {
    type: 'function',
    name: 'save_customer_profile',
    description:
      'Salva o cadastro básico do cliente. Use ANTES de agendar pela primeira vez, depois de ' +
      'confirmar o nome e oferecer (sem insistir) email e data de nascimento. O telefone já é ' +
      'conhecido automaticamente - NÃO peça. Email e data de nascimento são OPCIONAIS: se o ' +
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
            'Data de nascimento normalizada para YYYY-MM-DD (ex: cliente disse "21 de março de ' +
            '1993" -> "1993-03-21"), ou "" se não informada (opcional). NUNCA peça nem mostre esse ' +
            'formato ao cliente: converse em linguagem natural (21/03/1993) e converta você mesmo.',
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
        professional_id: {
          type: 'string',
          description:
            'ID do profissional escolhido (vide [usr_...] em "## Profissionais"). Use "" para ' +
            '"sem preferência" - o sistema escolhe um livre. Em estabelecimentos com um único ' +
            'profissional, sempre "".',
        },
      },
      required: ['service_id', 'starts_at', 'professional_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'book_recurring_appointment',
    description:
      'Cria uma SÉRIE de agendamentos recorrentes confirmados (toda semana, a cada 15 dias ou ' +
      'todo mês), a partir de um horário inicial. Use quando o cliente confirmar que quer repetir ' +
      'o agendamento e disser a frequência e quantas vezes. Horários ocupados ou fora do ' +
      'expediente são PULADOS automaticamente - o resultado traz `skipped` (datas puladas) e ' +
      '`created_count`. Avise o cliente sobre as datas puladas. Limite de 90 dias adiante.',
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
            'Data/hora da PRIMEIRA ocorrência no formato ISO 8601 com offset do fuso do ' +
            'estabelecimento, ex: 2026-05-28T14:00:00-03:00',
        },
        frequency: {
          type: 'string',
          enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          description: 'Frequência: WEEKLY (semanal), BIWEEKLY (quinzenal) ou MONTHLY (mensal).',
        },
        occurrences: {
          type: 'integer',
          description: 'Quantas vezes no total (incluindo a primeira). Entre 2 e 12.',
        },
        professional_id: {
          type: 'string',
          description:
            'ID do profissional da série (vide [usr_...] em "## Profissionais"). A série inteira ' +
            'fica com o mesmo profissional. Use "" para "sem preferência". Em estabelecimentos ' +
            'com um único profissional, sempre "".',
        },
      },
      required: ['service_id', 'starts_at', 'frequency', 'occurrences', 'professional_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'create_payment',
    description:
      'Gera uma cobrança (Pix copia-e-cola ou link de cartão) para um agendamento do PRÓPRIO ' +
      'cliente. Use SÓ depois de book_appointment ter dado certo e o cliente ter escolhido pagar ' +
      'agora e o meio. Pagamento é OPCIONAL - nunca force. Se o resultado vier com ' +
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
    name: 'cancel_appointment_series',
    description:
      'Cancela TODAS as ocorrências futuras de uma série recorrente do PRÓPRIO cliente. Use ' +
      'quando o cliente confirmar que quer cancelar a série inteira (não só uma ocorrência). O ' +
      'ID da série vem em "Seus agendamentos" (ex: "série cmxxxx"). Para cancelar só uma ' +
      'ocorrência, use cancel_appointment com o [apt_...] específico.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        series_id: {
          type: 'string',
          description: 'ID da série recorrente (vide "série ..." em "Seus agendamentos").',
        },
      },
      required: ['series_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'reschedule_appointment',
    description:
      'Remarca um agendamento futuro do PRÓPRIO cliente: muda o horário e/ou troca o serviço. ' +
      'Use para QUALQUER alteração de um agendamento que já existe (novo horário, novo serviço ' +
      'ou ambos) - NUNCA cancele e crie outro. Use APENAS depois do cliente confirmar.',
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
            'e sem conflito com outros agendamentos. Para manter o mesmo horário e só trocar o ' +
            'serviço, repita o horário atual do agendamento.',
        },
        new_service_id: {
          type: 'string',
          description:
            'ID do novo serviço (vide [srv_...]) quando o cliente quiser TROCAR de serviço, ou ' +
            '"" para manter o serviço atual.',
        },
      },
      required: ['appointment_id', 'new_starts_at', 'new_service_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'request_human_support',
    description:
      'Transfere a conversa para um atendente humano do estabelecimento. Use quando o cliente ' +
      'pedir explicitamente pra falar com uma pessoa/humano/atendente, OU quando ele tiver um ' +
      'problema, reclamação ou pedido que você não consegue resolver por aqui (fora de agendar, ' +
      'remarcar, cancelar, cobrar ou tirar dúvidas simples). Depois de chamar, avise o cliente ' +
      'de forma curta e gentil que você já chamou o responsável e que em breve alguém responde ' +
      'por aqui. NÃO use pra dúvidas que você mesmo consegue responder.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Resumo curto do motivo do cliente querer falar com uma pessoa (ex: "reclamação ' +
            'sobre atendimento anterior", "quer negociar preço"). Use "" se não estiver claro.',
        },
      },
      required: ['reason'],
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
      professionalId: String(args.professional_id ?? '').trim() || undefined,
    });
    return JSON.stringify(result);
  }

  if (name === 'book_recurring_appointment') {
    const freq = String(args.frequency ?? '');
    const frequency: RecurrenceFrequency =
      freq === 'BIWEEKLY' ? 'BIWEEKLY' : freq === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY';
    const result = await bookRecurringAppointment({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      serviceId: String(args.service_id ?? ''),
      startsAtIso: String(args.starts_at ?? ''),
      frequency,
      occurrences: Number(args.occurrences ?? 0),
      professionalId: String(args.professional_id ?? '').trim() || undefined,
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

  if (name === 'cancel_appointment_series') {
    const result = await cancelSeriesForContact({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      seriesId: String(args.series_id ?? ''),
    });
    return JSON.stringify(result);
  }

  if (name === 'reschedule_appointment') {
    const newServiceId = String(args.new_service_id ?? '').trim();
    const result = await rescheduleAppointmentForContact({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      appointmentId: String(args.appointment_id ?? ''),
      newStartsAtIso: String(args.new_starts_at ?? ''),
      newServiceId: newServiceId || undefined,
    });
    return JSON.stringify(result);
  }

  if (name === 'request_human_support') {
    const result = await initiateHandoff({
      tenantId: ctx.tenantId,
      contactId: ctx.contactId,
      conversationId: ctx.conversationId,
      reason: String(args.reason ?? ''),
    });
    return JSON.stringify(result);
  }

  return JSON.stringify({ ok: false, reason: `tool desconhecida: ${name}` });
}
