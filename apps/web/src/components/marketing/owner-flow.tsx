import { Bell, CalendarDays, Users } from 'lucide-react';

import { Container } from './container';

const features = [
  {
    Icon: CalendarDays,
    title: 'Agenda inteligente',
    text: 'Respeita seu expediente e seus intervalos. Nunca marca um em cima do outro.',
  },
  {
    Icon: Bell,
    title: 'Confirmação e lembrete automáticos',
    text: 'Já no plano base. O cliente é avisado no WhatsApp sem você digitar nada.',
  },
  {
    Icon: Users,
    title: 'Serviços, equipe e pagamentos',
    text: 'Cadastra uma vez e pronto: preços, profissionais e recebimento no mesmo lugar.',
  },
];

const rows = [
  { time: '9h00', name: 'Marcos A. · Corte + barba', via: 'via app', tag: 'confirmado' },
  { time: '10h00', name: 'Renata C. · Sobrancelha', via: 'via web', tag: 'confirmado' },
  { time: '11h30', name: 'João P. · Corte', via: 'balcão', tag: 'lembrete às 9h30' },
];

export function OwnerFlow() {
  return (
    <section
      id="dono"
      className="bg-green-deep text-cream relative overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(900px 420px at 75% -10%, rgba(47,211,122,.13), transparent), radial-gradient(700px 380px at 10% 115%, rgba(255,90,54,.09), transparent)',
      }}
    >
      <Container className="relative grid items-center gap-16 py-24 lg:grid-cols-[440px_1fr]">
        <div>
          <div className="text-on-emerald-mut mb-4 text-[0.72rem] font-bold uppercase tracking-[0.15em]">
            Pro dono
          </div>
          <h2 className="text-cream mb-4 font-serif text-[clamp(2rem,4vw,2.7rem)] font-normal leading-[1.08] tracking-[-0.02em]">
            Agendou em qualquer canal, <em className="italic">cai tudo aqui.</em>
          </h2>
          <p className="text-on-emerald-mut mb-9 text-[1.06rem] leading-[1.6]">
            Um painel só pra ver o dia, cadastrar serviços, cuidar da equipe e receber. Sem planilha,
            sem caderninho, sem "me manda um zap".
          </p>
          <div className="flex flex-col gap-[22px]">
            {features.map(({ Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <span className="bg-green-card border-green-bright/25 grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] border">
                  <Icon className="text-green-bright size-5" aria-hidden />
                </span>
                <div>
                  <div className="text-cream mb-0.5 font-semibold">{title}</div>
                  <div className="text-on-emerald-mut text-[0.9rem] leading-[1.5]">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mock do painel do dono */}
        <div className="relative">
          <div className="absolute -top-4 left-6 z-10 hidden gap-2.5 xl:flex">
            <span className="bg-green-card border-green-bright/30 text-cream rounded-full border px-4 py-2 text-xs font-semibold shadow-[0_12px_28px_rgba(2,16,10,.5)]">
              Novo agendamento · <em className="text-green-bright not-italic">via app</em>
            </span>
            <span className="bg-green-card border-green-bright/30 text-cream rounded-full border px-4 py-2 text-xs font-semibold shadow-[0_12px_28px_rgba(2,16,10,.5)]">
              Novo agendamento · <em className="text-green-bright not-italic">via web</em>
            </span>
          </div>
          <div className="bg-paper overflow-hidden rounded-3xl shadow-[0_30px_70px_rgba(2,16,10,.45)]">
            <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
              <div className="flex items-baseline gap-3">
                <span className="text-ink font-serif text-[1.2rem] font-semibold">Hoje, quarta</span>
                <span className="text-sub text-[0.8rem] font-medium">9 de julho · 8 agendamentos</span>
              </div>
              <div className="flex gap-2">
                <span className="bg-green-deep text-cream rounded-full px-3.5 py-1.5 text-xs font-semibold">
                  Agenda
                </span>
                {['Serviços', 'Equipe', 'Pagamentos'].map((t) => (
                  <span
                    key={t}
                    className="border-edge text-ink-70 hidden rounded-full border px-3.5 py-1.5 text-xs font-semibold sm:inline"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-line grid grid-cols-3 border-b">
              <div className="border-line border-r px-6 py-4">
                <div className="text-ink-30 text-[0.62rem] font-bold uppercase tracking-[0.12em]">
                  Hoje
                </div>
                <div className="text-ink font-serif text-[1.55rem] font-semibold">R$ 560</div>
              </div>
              <div className="border-line border-r px-6 py-4">
                <div className="text-ink-30 text-[0.62rem] font-bold uppercase tracking-[0.12em]">
                  Confirmados
                </div>
                <div className="text-ink font-serif text-[1.55rem] font-semibold">
                  7 <span className="text-green-bright font-sans text-[0.8rem]">de 8</span>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="text-ink-30 text-[0.62rem] font-bold uppercase tracking-[0.12em]">
                  Próximo livre
                </div>
                <div className="text-ink font-serif text-[1.55rem] font-semibold">14h30</div>
              </div>
            </div>
            <div className="flex flex-col gap-2 px-6 pb-6 pt-4">
              {rows.map((r) => (
                <div
                  key={r.time}
                  className="bg-cream border-line flex items-center gap-3.5 rounded-[14px] border px-4 py-3"
                >
                  <span className="text-green-deep w-[52px] shrink-0 font-serif text-[0.95rem] font-semibold">
                    {r.time}
                  </span>
                  <span className="text-ink flex-1 text-[0.9rem] font-semibold">{r.name}</span>
                  <span className="text-sub hidden text-xs font-medium sm:inline">{r.via}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold ${
                      r.tag === 'confirmado'
                        ? 'bg-chip text-green-deep'
                        : 'bg-cream border-edge text-sub border'
                    }`}
                  >
                    {r.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
