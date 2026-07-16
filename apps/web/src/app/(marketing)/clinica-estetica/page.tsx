import { CLINICA_ESTETICA } from '@/components/marketing/nicho/content';
import { NicheLanding } from '@/components/marketing/nicho/landing';

export const metadata = {
  title: CLINICA_ESTETICA.metaTitle,
  description: CLINICA_ESTETICA.metaDescription,
};

// A vitrine de preços lê o catálogo dinâmico (tabela Plan), mesma fonte da home e da
// /precos: repreçar/renomear no admin reflete aqui na hora, sem rebuild.
export const dynamic = 'force-dynamic';

export default function ClinicaEsteticaPage() {
  return <NicheLanding content={CLINICA_ESTETICA} />;
}
