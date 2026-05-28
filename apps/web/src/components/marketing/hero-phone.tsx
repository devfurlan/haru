import { cn } from '@/lib/utils';

const bubble = 'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[0.86rem] leading-snug opacity-0 animate-rise';
const userBubble = 'self-end rounded-br-[5px] bg-[#1f6b46] text-[#eafff2]';
const botBubble = 'self-start rounded-bl-[5px] bg-[#f3efe4] text-[#142019]';

const waveBars = [6, 12, 18, 9, 14, 7];

export function HeroPhone() {
  return (
    <div className="relative mx-auto w-[340px] max-w-full rounded-[42px] border-[9px] border-[#08160f] bg-[#0b1f17] px-3 pb-[18px] pt-3.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
      {/* topo */}
      <div className="mb-3 flex items-center gap-2.5 border-b border-white/[0.07] px-2 pb-3 pt-1.5">
        <div className="grid h-[38px] w-[38px] place-items-center rounded-full bg-gradient-to-br from-green to-green-bright font-serif text-lg font-black text-[#06140d]">
          B
        </div>
        <div className="text-[0.92rem] font-bold text-cream">
          Barbearia do Téo
          <span className="block text-[0.72rem] font-medium text-green-bright/90">
            online · atende por IA
          </span>
        </div>
      </div>

      {/* chat */}
      <div className="flex min-h-[430px] flex-col gap-2.5 px-1 pb-1 pt-0.5">
        <div className={cn(bubble, userBubble)} style={{ animationDelay: '0.3s' }}>
          oi
        </div>
        <div className={cn(bubble, userBubble)} style={{ animationDelay: '0.55s' }}>
          queria cortar o cabelo sábado de tarde
        </div>
        <div className={cn(bubble, botBubble)} style={{ animationDelay: '1s' }}>
          Opa! Tenho <b>sábado às 14h, 15h30 e 17h</b> com o Téo 💈 Qual fica melhor pra você?
        </div>

        {/* áudio do cliente */}
        <div
          className={cn(bubble, userBubble, 'flex items-center gap-2.5')}
          style={{ animationDelay: '1.5s' }}
        >
          <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#9fe9bf] text-[0.6rem] text-green-deep">
            ▶
          </span>
          <span className="flex h-[18px] items-center gap-[2.5px]">
            {waveBars.map((h, i) => (
              <i key={i} className="block w-[2.5px] rounded-sm bg-[#9fe9bf]" style={{ height: h }} />
            ))}
          </span>
          <span className="text-[0.72rem] opacity-80">0:04</span>
        </div>

        {/* digitando */}
        <div
          className="flex animate-rise gap-1 self-start rounded-2xl rounded-bl-[5px] bg-[#f3efe4] px-3.5 py-3 opacity-0"
          style={{ animationDelay: '2.2s' }}
        >
          {[0, 0.2, 0.4].map((d, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-blink rounded-full bg-[#7a8a82]"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </div>

        {/* confirmação do bot */}
        <div
          className={cn(bubble, 'self-start rounded-bl-[5px] bg-green font-semibold text-[#eafff2]')}
          style={{ animationDelay: '2.7s' }}
        >
          Fechado, marquei pra <b>sábado às 15h30</b> ✅
          <small className="mt-1 block text-[0.78rem] font-medium opacity-85">
            Corte masculino · 45min · R$ 45 · você recebe um lembrete antes
          </small>
        </div>
      </div>

      {/* tags flutuantes */}
      <div className="absolute left-0 top-[120px] -rotate-6 lg:-left-11">
        <div
          className="animate-rise rounded-full bg-coral px-3 py-1.5 text-[0.74rem] font-bold text-white opacity-0 shadow-coral"
          style={{ animationDelay: '2.8s' }}
        >
          entende áudio 🎙️
        </div>
      </div>
      <div className="absolute bottom-[90px] right-0 rotate-[5deg] lg:-right-9">
        <div
          className="animate-rise rounded-full bg-ink px-3 py-1.5 text-[0.74rem] font-bold text-white opacity-0 shadow-soft"
          style={{ animationDelay: '2.8s' }}
        >
          nunca marca em cima ✅
        </div>
      </div>
    </div>
  );
}
