'use server';

import { requireUserAndTenant } from '@/lib/auth';
import { withinRateLimitFor } from '@/lib/ratelimit';
import {
  getSupportHistory,
  respondToSupport,
  type SupportAuthor,
  type SupportTurnPublic,
} from '@/lib/support/core';

async function currentAuthor(): Promise<SupportAuthor> {
  const user = await requireUserAndTenant();
  return {
    channel: 'WEB',
    userId: user.id,
    tenantId: user.tenant.id,
    name: user.name,
    email: user.email,
    tenantName: user.tenant.name,
  };
}

export async function getSupportThread(): Promise<SupportTurnPublic[]> {
  return getSupportHistory(await currentAuthor());
}

export async function sendSupportMessage(body: string): Promise<{ reply: string }> {
  const author = await currentAuthor();
  const rateKey = author.channel === 'WEB' ? author.userId : author.account.id;
  // Cada mensagem dispara chamadas pagas ao LLM: cota por usuário contra abuso de custo.
  const withinBudget =
    (await withinRateLimitFor(rateKey, 'support-min', 8, 60)) &&
    (await withinRateLimitFor(rateKey, 'support-day', 200, 86_400));
  if (!withinBudget) {
    return {
      reply: 'Você enviou muitas mensagens em pouco tempo. Aguarde um instante e tente de novo.',
    };
  }
  return respondToSupport(author, body);
}
