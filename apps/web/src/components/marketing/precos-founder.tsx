import { Container } from './container';

/**
 * Bloco do fundador (assume responsabilidade pessoal) - converte melhor que
 * depoimento genérico em produto novo, sem inventar prova social.
 *
 * PREENCHER com dados reais: enquanto `name` estiver vazio, o bloco não renderiza
 * (melhor nada do que placeholder falso). `photoSrc` opcional - sem foto, cai no
 * avatar de iniciais. ponytail: constante local; só vira CMS se mudar com frequência.
 */
const FOUNDER = {
  name: '', // ex.: 'Lucas Furlan' - vazio = bloco oculto
  role: 'fundador',
  quote:
    'Criei o Demandaê pra dono de negócio ter a agenda cheia sem viver preso ao WhatsApp. Se em 30 dias não resolver o seu problema, devolvo cada centavo.',
  photoSrc: null as string | null,
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')
  ).toUpperCase();
}

export function PrecosFounder() {
  if (!FOUNDER.name) return null;

  return (
    <section className="py-24">
      <Container>
        <figure className="border-border bg-paper mx-auto flex max-w-[760px] flex-col items-center gap-6 rounded-3xl border p-10 text-center sm:flex-row sm:text-left">
          {FOUNDER.photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={FOUNDER.photoSrc}
              alt={FOUNDER.name}
              className="size-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="bg-ink text-cream flex size-20 shrink-0 items-center justify-center rounded-full font-serif text-2xl font-bold">
              {initials(FOUNDER.name)}
            </span>
          )}
          <div>
            <blockquote className="font-serif text-[1.35rem] font-medium leading-snug tracking-[-0.01em]">
              "{FOUNDER.quote}"
            </blockquote>
            <figcaption className="text-ink-soft mt-4 text-sm">
              <span className="text-foreground font-semibold">{FOUNDER.name}</span>, {FOUNDER.role}
            </figcaption>
          </div>
        </figure>
      </Container>
    </section>
  );
}
