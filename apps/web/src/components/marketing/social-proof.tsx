import { Container } from './container';

/**
 * Espaço reservado pra prova social. NÃO inventamos depoimento/logo/número: enquanto
 * não houver caso real, fica este placeholder honesto - é só trocar por depoimentos
 * verdadeiros quando os primeiros clientes chegarem.
 */
export function SocialProof() {
  return (
    <section className="py-16">
      <Container>
        <div className="border-border bg-paper/60 mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-10 text-center">
          <div className="flex -space-x-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="border-paper bg-cream-2 h-9 w-9 rounded-full border-2"
                aria-hidden
              />
            ))}
          </div>
          <p className="text-ink-soft max-w-md text-[0.98rem] leading-relaxed">
            Estamos entrando com os primeiros negócios agora. As histórias de quem usa o Demandaê
            aparecem aqui - reais, sem número inventado.
          </p>
        </div>
      </Container>
    </section>
  );
}
