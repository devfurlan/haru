import {
  BellIcon,
  CalendarIcon,
  HeartIcon,
  HomeIcon,
  MapPinIcon,
  ScissorsIcon,
  SearchIcon,
  UserIcon,
} from './app-icons';

const tabs = [
  { Icon: HomeIcon, label: 'Início', active: true },
  { Icon: SearchIcon, label: 'Buscar', active: false },
  { Icon: CalendarIcon, label: 'Agenda', active: false },
  { Icon: UserIcon, label: 'Perfil', active: false },
];

/**
 * Mockup do app do cliente final (mesma identidade do app mobile real). Usado na
 * seção "App do cliente" e, em escala menor, no hero ao lado do mock da web pública.
 * `chips` controla as tags flutuantes de destaque (desligadas no hero pra não poluir).
 */
export function ClientAppPhone({ chips = true }: { chips?: boolean }) {
  return (
    <div className="relative mx-auto w-[320px] max-w-full">
      {/* aparelho */}
      <div className="rounded-[44px] border-[10px] border-[#08160f] bg-[#0b1f17] p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]">
        {/* tela */}
        <div className="bg-cream relative overflow-hidden rounded-[34px]">
          <span className="absolute left-1/2 top-2 z-10 h-1.5 w-20 -translate-x-1/2 rounded-full bg-black/15" />

          {/* header do app */}
          <div className="flex items-center justify-between px-5 pb-4 pt-8">
            <div>
              <p className="text-sub text-[0.68rem] font-bold uppercase tracking-[0.14em]">
                Boa tarde
              </p>
              <p className="text-ink font-serif text-xl font-bold">Oi, Marina</p>
            </div>
            <span className="bg-paper text-ink relative grid h-9 w-9 place-items-center rounded-full shadow-sm">
              <BellIcon className="h-[18px] w-[18px]" />
              <span className="bg-coral absolute right-2 top-2 h-2 w-2 rounded-full" />
            </span>
          </div>

          {/* próximo agendamento */}
          <div
            className="animate-rise bg-green-card text-cream shadow-soft mx-4 rounded-2xl p-4 opacity-0"
            style={{ animationDelay: '0.15s' }}
          >
            <p className="text-green-bright text-[0.64rem] font-bold uppercase tracking-[0.14em]">
              Próximo
            </p>
            <p className="mt-1 font-serif text-lg font-semibold leading-tight">Corte + barba</p>
            <p className="text-cream/70 text-[0.8rem]">Barbearia do Téo · com o Téo</p>
            <div className="mt-3 flex items-center gap-2 text-[0.8rem]">
              <span className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 font-semibold">
                <CalendarIcon className="h-3.5 w-3.5" /> Sáb, 15h30
              </span>
              <span className="rounded-md bg-white/10 px-2 py-1 font-semibold">R$ 65</span>
            </div>
            <div className="mt-3.5 flex gap-2">
              <span className="bg-coral flex-1 rounded-lg py-2 text-center text-[0.78rem] font-bold text-white">
                Remarcar
              </span>
              <span className="flex-1 rounded-lg border border-white/25 py-2 text-center text-[0.78rem] font-bold">
                Como chegar
              </span>
            </div>
          </div>

          {/* atalhos */}
          <div className="mt-4 flex gap-2 px-4">
            <div className="border-line bg-paper flex-1 rounded-xl border px-3 py-3 text-center">
              <MapPinIcon className="text-green mx-auto h-[22px] w-[22px]" />
              <div className="text-ink mt-1.5 text-[0.74rem] font-bold">Buscar perto</div>
            </div>
            <div className="border-line bg-paper flex-1 rounded-xl border px-3 py-3 text-center">
              <HeartIcon className="text-coral mx-auto h-[22px] w-[22px]" />
              <div className="text-ink mt-1.5 text-[0.74rem] font-bold">Favoritos</div>
            </div>
          </div>

          {/* volte pra */}
          <div className="mt-4 px-4">
            <p className="text-sub mb-2 text-[0.68rem] font-bold uppercase tracking-[0.12em]">
              Volte pra
            </p>
            <div className="border-line bg-paper flex items-center gap-3 rounded-xl border px-3 py-2.5">
              <span className="bg-green/10 text-green grid h-9 w-9 place-items-center rounded-full">
                <ScissorsIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="flex-1 leading-tight">
                <p className="text-ink text-[0.82rem] font-bold">Barbearia do Téo</p>
                <p className="text-sub text-[0.72rem]">1,2 km de você · aberto agora</p>
              </div>
              <HeartIcon filled className="text-coral h-[18px] w-[18px]" />
            </div>
          </div>

          {/* tab bar */}
          <div className="border-line bg-paper/70 mt-4 flex items-center justify-around border-t px-2 py-3 text-[0.6rem] font-semibold">
            {tabs.map((t) => (
              <span
                key={t.label}
                className={`flex flex-col items-center gap-1 ${t.active ? 'text-green' : 'text-sub'}`}
              >
                <t.Icon className="h-[19px] w-[19px]" />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* tags flutuantes - nas bordas, sem cobrir os títulos do card */}
      {chips && (
        <>
          <div className="absolute -right-5 top-9 rotate-[5deg] lg:-right-9">
            <div
              className="animate-rise bg-coral shadow-coral rounded-full px-3 py-1.5 text-[0.72rem] font-bold text-white opacity-0"
              style={{ animationDelay: '0.7s' }}
            >
              lembrete no push 🔔
            </div>
          </div>
          <div className="absolute -left-4 bottom-56 -rotate-6 lg:-left-9">
            <div
              className="animate-rise bg-coral shadow-coral rounded-full px-3 py-1.5 text-[0.72rem] font-bold text-white opacity-0"
              style={{ animationDelay: '0.85s' }}
            >
              remarca sozinho 🔁
            </div>
          </div>
        </>
      )}
    </div>
  );
}
