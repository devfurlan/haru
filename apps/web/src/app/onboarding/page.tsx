import { redirect } from 'next/navigation';

import { requireUserAndTenant } from '@/lib/auth';

import { OnboardingWizard } from './onboarding-wizard';

// Rota top-level (fora do shell do dashboard): tela cheia, sem sidebar. O gate do
// (dashboard)/layout empurra pra cá quem ainda não concluiu; aqui, quem já concluiu
// volta pro painel (não fica preso no wizard).
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { tenant } = await requireUserAndTenant();
  if (tenant.onboardingCompletedAt) redirect('/dashboard');

  const { plano } = await searchParams;

  return (
    <OnboardingWizard
      tenantName={tenant.name}
      slug={tenant.slug}
      segment={tenant.segment}
      address={tenant.address}
      plano={plano ?? null}
    />
  );
}
