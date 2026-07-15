import { Agenda } from '@/components/marketing/funcionalidades/agenda';
import { Cliente } from '@/components/marketing/funcionalidades/cliente';
import { Differentiators } from '@/components/marketing/funcionalidades/differentiators';
import { Dinheiro } from '@/components/marketing/funcionalidades/dinheiro';
import { EmBreve } from '@/components/marketing/funcionalidades/em-breve';
import { Fidelidade } from '@/components/marketing/funcionalidades/fidelidade';
import { FinalCta } from '@/components/marketing/funcionalidades/final-cta';
import { Gestao } from '@/components/marketing/funcionalidades/gestao';
import { Hero } from '@/components/marketing/funcionalidades/hero';
import { PillarsIndex } from '@/components/marketing/funcionalidades/pillars-index';
import { Selos } from '@/components/marketing/funcionalidades/selos';

export const metadata = {
  title: 'Funcionalidades · Demandaê',
  description:
    'Tudo que o Demandaê faz: agenda que não trava, app do cliente com a sua marca, pagamentos, fidelidade, clube de assinatura e um painel que junta a operação inteira.',
};

export default function FuncionalidadesPage() {
  return (
    <>
      <Hero />
      <PillarsIndex />
      <Agenda />
      <Cliente />
      <Dinheiro />
      <Gestao />
      <Fidelidade />
      <Selos />
      <Differentiators />
      <EmBreve />
      <FinalCta />
    </>
  );
}
