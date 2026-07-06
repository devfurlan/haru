import { CalendarIcon, ScissorsIcon } from './app-icons';
import { ClientAppPhone } from './client-phone';

const services = [
  { name: 'Corte masculino', meta: '45min', price: 'R$ 45' },
  { name: 'Corte + barba', meta: '1h', price: 'R$ 65' },
];

const slots = ['14:00', '15:30', '17:00'];

/** Janela de navegador com a página pública do estabelecimento (/seunegocio). */
function PublicPageBrowser() {
  return (
    <div className="bg-paper text-ink w-full overflow-hidden rounded-2xl border border-black/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]">
      {/* chrome do navegador */}
      <div className="bg-cream-2 flex items-center gap-2 border-b border-black/5 px-4 py-2.5">
        <span className="flex gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="bg-paper text-sub ml-2 flex-1 truncate rounded-md px-3 py-1 text-[0.72rem] font-medium">
          demandae.com/<span className="text-ink font-semibold">barbeariadoteo</span>
        </span>
      </div>

      {/* capa + identidade */}
      <div className="from-green to-green-deep relative h-[74px] bg-gradient-to-br">
        <div className="border-paper bg-cream text-green-deep absolute -bottom-5 left-5 grid h-12 w-12 place-items-center rounded-2xl border-2 font-serif text-xl font-black shadow-sm">
          T
        </div>
      </div>
      <div className="px-5 pb-5 pt-7">
        <p className="font-serif text-lg font-bold leading-none">Barbearia do Téo</p>
        <p className="text-sub mt-1 text-[0.78rem] font-medium">Aberto até 20h · Centro</p>

        <p className="text-sub mb-2 mt-4 text-[0.68rem] font-bold uppercase tracking-[0.12em]">
          Escolha um serviço
        </p>
        <ul className="flex flex-col gap-2">
          {services.map((s) => (
            <li
              key={s.name}
              className="border-line bg-cream/50 flex items-center gap-3 rounded-xl border px-3 py-2.5"
            >
              <span className="bg-green/10 text-green grid h-8 w-8 shrink-0 place-items-center rounded-lg">
                <ScissorsIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[0.85rem] font-bold">{s.name}</p>
                <p className="text-sub text-[0.72rem]">
                  {s.meta} · {s.price}
                </p>
              </div>
              <span className="bg-coral rounded-lg px-3 py-1.5 text-[0.72rem] font-bold text-white">
                Agendar
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center gap-2">
          <CalendarIcon className="text-green h-4 w-4 shrink-0" />
          {slots.map((t, i) => (
            <span
              key={t}
              className={`rounded-lg px-2.5 py-1 text-[0.74rem] font-bold ${
                i === 1 ? 'bg-green text-cream' : 'border-line bg-paper text-ink-soft border'
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-[470px] sm:pb-[150px] lg:pb-[130px]">
      {/* web pública do estabelecimento */}
      <div className="w-full max-w-[430px] sm:ml-auto">
        <PublicPageBrowser />
      </div>

      {/* app do cliente subindo no canto inferior-esquerdo (topo do browser fica livre) */}
      <div className="absolute bottom-0 left-0 hidden origin-bottom-left scale-[0.55] drop-shadow-2xl sm:block lg:-left-4">
        <ClientAppPhone chips={false} />
      </div>

      {/* chips dos canais */}
      <span
        className="animate-rise bg-coral shadow-coral absolute -top-3 right-4 inline-block rotate-[4deg] rounded-full px-3 py-1.5 text-[0.74rem] font-bold text-white opacity-0 lg:-right-6"
        style={{ animationDelay: '0.5s' }}
      >
        agenda pela web 🌐
      </span>
      <span
        className="animate-rise bg-green-bright text-green-deep absolute bottom-10 right-2 inline-block -rotate-3 rounded-full px-3 py-1.5 text-[0.74rem] font-bold opacity-0 sm:bottom-24 lg:right-4"
        style={{ animationDelay: '0.7s' }}
      >
        confirma no WhatsApp ✓
      </span>
    </div>
  );
}
