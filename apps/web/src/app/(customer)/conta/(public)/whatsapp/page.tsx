import { redirect } from 'next/navigation';

import { requireCustomerAccount } from '@/lib/customer-auth';
import { safeInternalPath } from '@/lib/safe-redirect';

import { WhatsappForm } from './whatsapp-form';

/**
 * Gate de onboarding: conta de cliente ainda SEM WhatsApp (entrou com Google, que não
 * pede telefone). Coleta o número uma vez pra a conta ficar completa - depois o
 * agendamento não pede mais nome/WhatsApp. Vive no shell (public) (cream + logo, sem
 * tabs) pra ser uma tela focada; o guard de sessão é o próprio requireCustomerAccount.
 */
export default async function WhatsappOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const account = await requireCustomerAccount();
  const { next } = await searchParams;
  const safeNext = safeInternalPath(next, '/conta');

  // Já tem número (confirmado ou pendente)? Esta tela não tem função - segue pro destino.
  if (account.phone || account.pendingPhone) redirect(safeNext);

  const firstName = (account.name ?? '').trim().split(/\s+/)[0] ?? '';
  return <WhatsappForm next={safeNext} firstName={firstName} />;
}
