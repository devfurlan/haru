import { Bell, CreditCard, Globe, LayoutGrid, Smartphone, Users, Webhook } from 'lucide-react';

import { Container } from './container';

const cardBase =
  'bg-paper border-edge rounded-[20px] border p-[30px] transition-shadow hover:shadow-[0_16px_36px_-18px_rgba(10,51,36,.25)]';
const iconBox = 'bg-green-deep mb-[18px] grid h-[46px] w-[46px] place-items-center rounded-[14px]';

function TimeBadge() {
  return (
    <span className="bg-chip text-green-deep absolute right-[22px] top-[22px] rounded-full px-3 py-1 text-[0.68rem] font-bold tracking-[0.06em]">
      TIME+
    </span>
  );
}

export function Features() {
  return (
    <section id="recursos" className="border-edge bg-line border-y">
      <Container className="py-24">
        <div className="mb-[52px] max-w-[620px]">
          <div className="text-sub mb-4 text-[0.72rem] font-bold uppercase tracking-[0.15em]">
            O que vem dentro
          </div>
          <h2 className="font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.08] tracking-[-0.02em]">
            Tudo que a operação precisa, <em className="font-normal italic">nada que atrapalha.</em>
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <div className={`${cardBase} lg:col-span-5`}>
            <span className={iconBox}>
              <Smartphone className="text-green-bright size-[22px]" aria-hidden />
            </span>
            <div className="mb-2 font-serif text-xl font-semibold">App do seu cliente</div>
            <p className="text-ink-70 text-[0.95rem] leading-[1.55]">
              Histórico, favoritos e "agendar de novo" num toque. Seu negócio na mão de quem volta
              sempre - iOS e Android.
            </p>
          </div>

          <div className={`${cardBase} lg:col-span-7`}>
            <div className="flex items-start justify-between gap-6">
              <div>
                <span className={iconBox}>
                  <Globe className="text-green-bright size-[22px]" aria-hidden />
                </span>
                <div className="mb-2 font-serif text-xl font-semibold">
                  Página pública do seu negócio
                </div>
                <p className="text-ink-70 max-w-[330px] text-[0.95rem] leading-[1.55]">
                  Com a sua marca, seus serviços e seus horários. Um link só pra divulgar onde
                  quiser.
                </p>
              </div>
              <div className="bg-cream border-edge mt-2 hidden shrink-0 rounded-[14px] border px-[18px] py-3.5 sm:block">
                <div className="text-ink-30 mb-1 text-[0.62rem] font-bold uppercase tracking-[0.12em]">
                  Seu link
                </div>
                <div className="text-green-deep text-[0.95rem] font-semibold">
                  demandae.com/<span className="text-coral">seunegocio</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`${cardBase} lg:col-span-7`}>
            <span className={iconBox}>
              <LayoutGrid className="text-green-bright size-[22px]" aria-hidden />
            </span>
            <div className="mb-2 font-serif text-xl font-semibold">Painel completo</div>
            <p className="text-ink-70 max-w-[420px] text-[0.95rem] leading-[1.55]">
              Dashboard do dia, agenda, cadastro de serviços e clientes. Tudo que você gerencia, num
              lugar só.
            </p>
          </div>

          <div className={`${cardBase} relative lg:col-span-5`}>
            <TimeBadge />
            <span className={iconBox}>
              <CreditCard className="text-green-bright size-[22px]" aria-hidden />
            </span>
            <div className="mb-2 font-serif text-xl font-semibold">Pagamento online</div>
            <p className="text-ink-70 text-[0.95rem] leading-[1.55]">
              Pix e cartão na hora do agendamento. Menos furo, caixa antecipado.
            </p>
          </div>

          <div className={`${cardBase} relative lg:col-span-4`}>
            <TimeBadge />
            <span className={iconBox}>
              <Users className="text-green-bright size-[22px]" aria-hidden />
            </span>
            <div className="mb-2 font-serif text-lg font-semibold">Vários profissionais</div>
            <p className="text-ink-70 text-[0.95rem] leading-[1.55]">
              Cada um com sua agenda e seus serviços.
            </p>
          </div>

          <div className={`${cardBase} relative lg:col-span-4`}>
            <TimeBadge />
            <span className={iconBox}>
              <Webhook className="text-green-bright size-[22px]" aria-hidden />
            </span>
            <div className="mb-2 font-serif text-lg font-semibold">Webhooks</div>
            <p className="text-ink-70 text-[0.95rem] leading-[1.55]">
              Discord, Slack, Zapier, n8n - sua agenda avisa onde você já trabalha.
            </p>
          </div>

          <div className={`${cardBase} lg:col-span-4`}>
            <span className={iconBox}>
              <Bell className="text-green-bright size-[22px]" aria-hidden />
            </span>
            <div className="mb-2 font-serif text-lg font-semibold">Notificações em camadas</div>
            <p className="text-ink-70 text-[0.95rem] leading-[1.55]">
              WhatsApp, e-mail e push do app. A mensagem chega por onde o cliente tá.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
