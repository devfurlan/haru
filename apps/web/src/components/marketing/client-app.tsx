import { BellIcon, MapPinIcon, RescheduleIcon, SmartphoneIcon } from './app-icons';
import { ClientAppPhone } from './client-phone';
import { Container } from './container';
import { Eyebrow } from './eyebrow';

const perks = [
  { Icon: SmartphoneIcon, text: 'Agenda e histórico na palma da mão, sempre à mão' },
  { Icon: RescheduleIcon, text: 'Remarca e cancela sozinho, a qualquer hora, sem te ligar' },
  { Icon: BellIcon, text: 'Lembrete no push e um toque pra salvar na agenda do celular' },
  { Icon: MapPinIcon, text: 'Mapa, "como chegar" e busca por negócios perto (GPS)' },
];

export function ClientApp() {
  return (
    <section id="app" className="bg-cream-2 relative overflow-hidden py-24">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(600px 420px at 88% 6%, rgba(14,122,69,.07), transparent 60%)',
        }}
      />
      <Container className="relative grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="order-2 lg:order-1">
          <ClientAppPhone />
        </div>

        <div className="order-1 lg:order-2">
          <Eyebrow>App do cliente</Eyebrow>
          <h2 className="text-foreground mb-4 mt-4 font-serif text-[clamp(2rem,4vw,3.05rem)] font-semibold leading-[1.05] tracking-[-0.01em]">
            Seu cliente <em className="text-green italic">no comando</em>, do agendar ao chegar.
          </h2>
          <p className="text-ink-soft mb-8 max-w-[520px] text-[1.1rem] leading-relaxed">
            No app, o cliente marca, reagenda, cancela e acha o caminho até você sem depender de
            ninguém. E quem está por perto encontra seu negócio na busca por proximidade. O app é
            grátis pro cliente - e quem prefere a web ou o WhatsApp segue por lá, sem ficar preso a
            um canal só.
          </p>
          <ul className="flex max-w-[520px] flex-col gap-3.5">
            {perks.map((p) => (
              <li key={p.text} className="flex items-start gap-3">
                <span className="bg-chip text-green grid h-9 w-9 shrink-0 place-items-center rounded-xl">
                  <p.Icon className="h-5 w-5" />
                </span>
                <span className="text-ink-soft pt-1.5 text-[1rem] leading-snug">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
