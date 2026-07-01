'use server';

import { requireUserAndTenant } from '@/lib/auth';
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
  return respondToSupport(await currentAuthor(), body);
}
