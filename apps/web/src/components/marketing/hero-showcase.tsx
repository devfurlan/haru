import { MessageCircle } from 'lucide-react';

/** Mock da página pública de agendamento (browser). Reusado no mobile como card estático. */
function WebCard({ className }: { className?: string }) {
  return (
    <div
      className={`bg-paper border-edge overflow-hidden rounded-[18px] border shadow-[0_30px_60px_-20px_rgba(2,16,10,.55)] ${className ?? ''}`}
    >
      <div className="border-line bg-cream flex items-center gap-2 border-b px-4 py-3">
        <span className="bg-edge h-2.5 w-2.5 rounded-full" />
        <span className="bg-edge h-2.5 w-2.5 rounded-full" />
        <span className="bg-edge h-2.5 w-2.5 rounded-full" />
        <span className="bg-paper border-line text-ink-70 ml-2.5 rounded-full border px-3.5 py-1 text-xs font-medium">
          demandae.com/<strong className="text-ink">barbearia-do-leo</strong>
        </span>
      </div>
      <div
        className="bg-green-deep px-6 py-5"
        style={{
          backgroundImage:
            'radial-gradient(360px 140px at 85% -30%, rgba(47,211,122,.16), transparent)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="bg-green-card border-green-bright/25 text-green-bright grid h-11 w-11 place-items-center rounded-[14px] border font-serif text-lg font-semibold">
            L
          </span>
          <div>
            <div className="text-cream font-serif text-[1.2rem] font-semibold">Barbearia do Léo</div>
            <div className="text-on-emerald-mut text-xs font-medium">
              ★ 4,9 · Vila Madalena · aberto agora
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-5">
        <div className="text-sub mb-3 text-[0.68rem] font-bold uppercase tracking-[0.14em]">
          Escolhe o serviço
        </div>
        <div className="flex flex-col gap-2">
          <div className="bg-cream border-green-deep flex items-center justify-between rounded-[14px] border-[1.5px] px-4 py-3">
            <span className="text-ink text-[0.95rem] font-semibold">Corte + barba</span>
            <span className="text-green-deep font-serif text-base font-semibold">R$ 70</span>
          </div>
          <div className="border-line flex items-center justify-between rounded-[14px] border px-4 py-3">
            <span className="text-ink-70 text-[0.95rem] font-medium">Corte</span>
            <span className="text-ink-70 font-serif text-[0.95rem] font-medium">R$ 45</span>
          </div>
        </div>
        <div className="bg-coral text-paper mt-3.5 rounded-[14px] py-3 text-center text-sm font-semibold">
          Continuar · passo 1 de 2
        </div>
      </div>
    </div>
  );
}

export function HeroShowcase() {
  return (
    <>
      {/* Mobile: só o card da página pública, estático. */}
      <div className="mx-auto w-full max-w-[420px] lg:hidden">
        <WebCard />
      </div>

      {/* Desktop: composição flutuante (web + app + aviso do WhatsApp). */}
      <div className="relative mx-auto hidden h-[560px] w-[540px] lg:block">
        <WebCard className="absolute left-0 top-[34px] w-[500px]" />

        {/* Telefone com o próximo agendamento */}
        <div className="bg-ink absolute bottom-0 right-0 w-[240px] rounded-[38px] p-[9px] shadow-[0_34px_64px_-18px_rgba(2,16,10,.6)]">
          <div className="bg-cream overflow-hidden rounded-[30px]">
            <div
              className="bg-green-deep px-[18px] pb-4 pt-5"
              style={{
                backgroundImage:
                  'radial-gradient(200px 90px at 90% -20%, rgba(47,211,122,.18), transparent)',
              }}
            >
              <div className="text-on-emerald-mut text-[0.8rem]">Que bom te ver,</div>
              <div className="text-cream font-serif text-xl font-semibold">Marcos</div>
            </div>
            <div className="px-3.5 pb-[18px] pt-3.5">
              <div className="text-sub mb-2 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em]">
                <span className="bg-green-bright animate-pulse-ring h-1.5 w-1.5 rounded-full" />
                Seu próximo · em 2 dias
              </div>
              <div className="bg-paper border-line rounded-2xl border p-3">
                <div className="text-ink font-serif text-[0.95rem] font-semibold">
                  Barbearia do Léo
                </div>
                <div className="text-sub mb-2 mt-0.5 text-[0.68rem] font-medium">
                  Corte + barba · com Léo
                </div>
                <div className="border-edge flex items-baseline justify-between border-t border-dashed pt-2">
                  <span className="text-green-deep font-serif text-[0.95rem] font-semibold">
                    Qua, 9 jul · 10h
                  </span>
                  <span className="text-ink font-serif text-[0.8rem] font-semibold">R$ 70</span>
                </div>
              </div>
              <div className="bg-coral text-paper mt-2.5 rounded-xl py-2.5 text-center text-[0.72rem] font-semibold">
                Agendar de novo
              </div>
            </div>
          </div>
        </div>

        {/* Aviso do WhatsApp */}
        <div className="bg-paper border-line absolute right-0 top-0 flex w-[320px] items-center gap-3 rounded-[18px] border p-3.5 shadow-[0_20px_44px_-14px_rgba(2,16,10,.5)]">
          <span className="bg-chip grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl">
            <MessageCircle className="text-green-deep size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex justify-between gap-2">
              <span className="text-ink text-xs font-bold">WhatsApp</span>
              <span className="text-ink-30 text-[0.68rem] font-medium">agora</span>
            </div>
            <div className="text-ink-70 text-[0.78rem] leading-[1.35]">
              Confirmado ✓ Corte + barba, qua 9 jul às 10h - Barbearia do Léo
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
