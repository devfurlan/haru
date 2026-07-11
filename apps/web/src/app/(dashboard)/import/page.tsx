import { redirect } from 'next/navigation';

import { prisma } from '@haru/database';

import { isAdmin, requireUserAndTenant } from '@/lib/auth';

import { ImportWizard } from './import-wizard';

export default async function ImportPage() {
  const user = await requireUserAndTenant();
  // Importar mexe na base inteira do tenant - só o dono. (O route handler repete o gate.)
  if (!isAdmin(user)) redirect('/dashboard');

  const [serviceCount, professionalCount] = await Promise.all([
    prisma.service.count({ where: { tenantId: user.tenant.id } }),
    prisma.user.count({ where: { tenantId: user.tenant.id, isProfessional: true } }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-5">
      <div>
        <h1 className="text-ink font-serif text-[28px] tracking-tight">Importar dados</h1>
        <p className="text-ink-50 mt-1 max-w-[560px] text-sm">
          Traga seus clientes, serviços e agendamentos do AppBarber, Trinks ou de uma planilha. Você
          confere tudo numa prévia antes de gravar - nada é importado sem sua confirmação.
        </p>
      </div>
      <ImportWizard serviceCount={serviceCount} professionalCount={professionalCount} />
    </div>
  );
}
