import { Btn } from '../home/btn';

export function FinalCta() {
  return (
    <section className="mx-auto max-w-[1080px] px-[clamp(20px,5vw,40px)] pb-[clamp(56px,7vw,88px)] pt-[clamp(48px,6vw,72px)]">
      <div className="bg-green-deep relative overflow-hidden rounded-[28px] px-[clamp(24px,4vw,48px)] py-[clamp(36px,5vw,60px)] text-center shadow-[0_40px_80px_-40px_rgba(10,51,36,.7)]">
        <div className="pointer-events-none absolute left-[18%] top-[-50px] h-[280px] w-[280px] bg-[radial-gradient(circle,rgba(47,211,122,.22),transparent_70%)]" />
        <div className="pointer-events-none absolute bottom-[-70px] right-[12%] h-[300px] w-[300px] bg-[radial-gradient(circle,rgba(255,90,54,.16),transparent_70%)]" />
        <div className="relative">
          <h2 className="text-on-emerald mb-[14px] font-serif text-[clamp(28px,5vw,40px)] font-normal leading-[1.12] tracking-[-.02em]">
            Teste sem risco por <span className="text-green-bright italic">30 dias</span>.
          </h2>
          <p className="text-on-emerald-mut mx-auto mb-[30px] max-w-[520px] font-sans text-[17px] font-normal leading-[1.55]">
            Contrate, use tudo, e se não for pra você devolvemos o valor integral. O fundador
            responde no WhatsApp.
          </p>
          <div className="flex flex-wrap justify-center gap-[14px]">
            <Btn variant="primary" size="lg" href="/signup">
              Começar agora
            </Btn>
            <Btn variant="secondary" size="lg" href="/funcionalidades">
              Ver funcionalidades
            </Btn>
          </div>
        </div>
      </div>
    </section>
  );
}
