import { redirect } from 'next/navigation';

import { isAdmin, requireUserAndTenant } from '@/lib/auth';

import { ImportWizard } from './import-wizard';

export default async function ImportPage() {
  const user = await requireUserAndTenant();
  // Importar mexe na base inteira do tenant - só o dono. (Os route handlers repetem o gate.)
  if (!isAdmin(user)) redirect('/dashboard');
  return <ImportWizard />;
}
