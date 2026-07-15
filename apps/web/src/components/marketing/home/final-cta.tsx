import { Btn } from './btn';

export function FinalCta() {
  return (
    // Faixa escura full-bleed (layout da home antiga), não card flutuante de cantos
    // arredondados: o fecho encosta no rodapé e os dois viram um bloco escuro só. Os glows
    // vêm como backgroundImage em vez de duas divs absolutas - mesma pegada, sem elemento extra.
    <section className="bg-green-deep relative overflow-hidden [background-image:radial-gradient(800px_380px_at_70%_-10%,rgba(47,211,122,.14),transparent),radial-gradient(640px_340px_at_15%_120%,rgba(255,90,54,.10),transparent)]">
      <div className="relative mx-auto max-w-[880px] px-[clamp(20px,5vw,40px)] py-[clamp(64px,9vw,112px)] text-center">
        <h2 className="text-on-emerald mb-4.5 font-serif text-[clamp(38px,5vw,56px)] font-normal leading-[1.06] tracking-[-.02em]">
          Teste sem risco por <span className="text-green-bright italic">30 dias</span>.
        </h2>
        <p className="text-on-emerald-mut mx-auto mb-9 max-w-[560px] font-sans text-[18px] font-normal leading-[1.6]">
          Contrate, use tudo, e se não for pra você devolvemos o valor integral. O fundador responde
          no WhatsApp.
        </p>
        <div className="flex flex-wrap justify-center gap-3.5">
          <Btn variant="primary" size="lg" href="/signup">
            Começar agora
          </Btn>
          <Btn variant="secondary" size="lg" href="/precos">
            Ver planos
          </Btn>
        </div>
      </div>
    </section>
  );
}
