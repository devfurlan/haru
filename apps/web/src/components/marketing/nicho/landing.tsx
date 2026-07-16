import { Faq } from '../home/faq';
import { FinalCta } from '../home/final-cta';
import { Hero } from '../home/hero';
import { HowItWorks } from '../home/how-it-works';
import { PricingPreview } from '../home/pricing-preview';

import type { NicheContent } from './content';
import { NicheFeatures, NichePains } from './sections';

/* Molde único das landings por nicho. A ordem e o ritmo das faixas são fixos - trocar
   qualquer coisa aqui muda TODOS os nichos de uma vez, que é o ponto: uma landing de nicho
   é a mesma espinha da home com a carne do nicho, não uma página nova.

   Hero, como funciona, preços, FAQ, garantias e fecho reusam os componentes da home de
   propósito - lá a copy da home é o default do prop e aqui passa a do nicho. Preço é o mesmo
   em todo nicho e vem do catálogo dinâmico (tabela Plan) - por isso as rotas são force-dynamic.

   Sem seção de prova social: enquanto não houver depoimento real do segmento, um slot vazio
   não vende nada e depoimento inventado não entra. Quando chegar o primeiro, ele entra aqui
   (entre PricingPreview e Faq) - o histórico do git tem o card tracejado que ficava no lugar. */
export function NicheLanding({ content }: { content: NicheContent }) {
  return (
    <>
      <Hero content={content} />
      <NichePains content={content} />
      <HowItWorks steps={content.steps} />
      <NicheFeatures content={content} />
      <PricingPreview />
      <Faq items={content.faqs} />
      <FinalCta />
    </>
  );
}
