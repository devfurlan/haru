import { redirect } from 'next/navigation';

import { AuthTitle } from '@/components/auth-ui';
import { getAuthUser, getCurrentUserAndTenant } from '@/lib/auth';
import { parsePlanParam } from '@/lib/plan-query';

import { OwnerSetupForm } from './setup-form';

// Conclusão do cadastro do dono via Google: o OAuth já autenticou (auth.users existe),
// aqui só coletamos o nome do estabelecimento pra criar o Tenant. Só chega quem passou
// pelo /auth/callback?flow=owner e ainda não é dono - o próprio callback já desvia donos
// pro painel, então este guard é a defesa de quem abre a URL direto.
export default async function OwnerSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/signup'); // sem sessão: precisa entrar com o Google antes
  if (await getCurrentUserAndTenant()) redirect('/dashboard'); // já é dono

  const plano = parsePlanParam((await searchParams).plano);
  const meta = authUser.user_metadata as { full_name?: string; name?: string } | null;
  const firstName = (meta?.full_name ?? meta?.name ?? '').trim().split(/\s+/)[0] ?? '';

  return (
    <>
      <AuthTitle
        plain="Quase"
        accent="lá"
        subtitle={
          firstName
            ? `${firstName}, só falta o nome do seu estabelecimento pra montar seu painel.`
            : 'Só falta o nome do seu estabelecimento pra montar seu painel.'
        }
      />

      <div className="mt-[26px]">
        <OwnerSetupForm plano={plano} />
      </div>
    </>
  );
}
