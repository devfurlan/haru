import { Bell, Globe, Smartphone } from 'lucide-react';

import { Container } from './container';

export function ClientFlow() {
  return (
    <section id="cliente" className="bg-cream py-24">
      <Container>
        <div className="mb-[52px] max-w-[640px]">
          <div className="text-sub mb-4 text-[0.72rem] font-bold uppercase tracking-[0.15em]">
            Pro seu cliente
          </div>
          <h2 className="mb-4 font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.08] tracking-[-0.02em]">
            Ele escolhe onde marcar.
            <br />
            <em className="font-normal italic">Você não perde nenhum.</em>
          </h2>
          <p className="text-ink-70 text-[1.06rem] leading-[1.6]">
            Ninguém fica preso a canal nenhum: quem gosta de app usa o app, quem veio do Instagram
            agenda pela web. O WhatsApp só avisa.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="bg-paper border-edge rounded-[20px] border p-7 transition-shadow hover:shadow-[0_16px_36px_-18px_rgba(10,51,36,.25)]">
            <span className="bg-green-deep mb-[18px] grid h-[46px] w-[46px] place-items-center rounded-[14px]">
              <Smartphone className="text-green-bright size-[22px]" aria-hidden />
            </span>
            <div className="text-sub mb-1.5 text-[0.68rem] font-bold uppercase tracking-[0.13em]">
              Canal 1 · App
            </div>
            <div className="mb-2 font-serif text-xl font-semibold">No app Demandaê</div>
            <p className="text-ink-70 text-[0.95rem] leading-[1.55]">
              Histórico, favoritos e remarcação num toque. Pro cliente que volta todo mês.
            </p>
          </div>

          <div className="bg-paper border-edge rounded-[20px] border p-7 transition-shadow hover:shadow-[0_16px_36px_-18px_rgba(10,51,36,.25)]">
            <span className="bg-green-deep mb-[18px] grid h-[46px] w-[46px] place-items-center rounded-[14px]">
              <Globe className="text-green-bright size-[22px]" aria-hidden />
            </span>
            <div className="text-sub mb-1.5 text-[0.68rem] font-bold uppercase tracking-[0.13em]">
              Canal 2 · Web
            </div>
            <div className="mb-2 font-serif text-xl font-semibold">Na sua página pública</div>
            <p className="text-ink-70 mb-3 text-[0.95rem] leading-[1.55]">
              Direto do navegador, sem baixar nada. O link que vai na bio do Instagram:
            </p>
            <span className="bg-cream border-edge text-green-deep inline-block rounded-full border px-3.5 py-1.5 text-[0.8rem] font-semibold">
              demandae.com/seunegocio
            </span>
          </div>

          <div className="bg-cream border-edge rounded-[20px] border-[1.5px] border-dashed p-7">
            <span className="bg-chip mb-[18px] grid h-[46px] w-[46px] place-items-center rounded-[14px]">
              <Bell className="text-green-deep size-[22px]" aria-hidden />
            </span>
            <div className="text-sub mb-1.5 text-[0.68rem] font-bold uppercase tracking-[0.13em]">
              Só o aviso · WhatsApp
            </div>
            <div className="mb-2 font-serif text-xl font-semibold">Confirmação e lembrete</div>
            <p className="text-ink-70 text-[0.95rem] leading-[1.55]">
              Chegam sozinhos no WhatsApp do cliente. Ninguém precisa agendar por lá - e ninguém
              esquece o horário.
            </p>
          </div>
        </div>

        {/* Bilhete de transição: seja qual for o canal, cai na mesma agenda. */}
        <div className="flex flex-col items-center gap-[18px] pt-[72px]">
          <div className="text-sub font-serif text-[1.06rem] italic">
            Seja qual for o caminho, termina do mesmo jeito:
          </div>
          <div className="bg-paper border-edge flex flex-col items-stretch overflow-hidden rounded-[18px] border shadow-[0_20px_44px_-18px_rgba(10,51,36,.25)] sm:flex-row sm:-rotate-1">
            <div className="flex items-center gap-3.5 px-6 py-[18px]">
              <span className="bg-green-deep text-green-bright grid h-11 w-11 place-items-center rounded-[14px] font-serif text-lg font-semibold">
                L
              </span>
              <div>
                <div className="text-ink font-serif text-[1.05rem] font-semibold">
                  Barbearia do Léo
                </div>
                <div className="text-sub text-xs font-medium">
                  Corte + barba · agendado <strong className="text-green-deep">via web</strong>
                </div>
              </div>
            </div>
            <div className="border-edge flex items-center gap-5 border-t border-dashed px-6 py-[18px] sm:border-l sm:border-t-0">
              <div>
                <div className="text-ink-30 text-[0.62rem] font-bold uppercase tracking-[0.12em]">
                  Qua, 9 jul
                </div>
                <div className="text-green-deep font-serif text-[1.35rem] font-semibold">10h00</div>
              </div>
              <span className="bg-chip text-green-deep inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold">
                <span className="bg-green-bright animate-pulse-ring h-1.5 w-1.5 rounded-full" />
                na sua agenda
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
