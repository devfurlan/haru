import type { ReactNode } from 'react';

import type { IconKey, NicheContent } from './content';

/* Seções específicas da landing de nicho: dores, recursos e prova social. O resto do molde
   (como funciona, preços, FAQ, fecho) reusa os componentes da home - ver landing.tsx. */

// ============================================================ Dores

/* Faixa escura, mesmo tratamento dos diferenciais da home: é o miolo emocional da página e
   precisa de contraste. Tile coral = a dor; seta verde = o que o Demandaê faz com ela. */
export function NichePains({ content }: { content: NicheContent }) {
  return (
    <section
      id="dores"
      className="bg-green-deep relative overflow-hidden py-[clamp(64px,8vw,100px)]"
    >
      <div className="pointer-events-none absolute left-[8%] top-[-90px] h-[400px] w-[400px] bg-[radial-gradient(circle,rgba(47,211,122,.16),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-110px] right-[5%] h-[460px] w-[460px] bg-[radial-gradient(circle,rgba(255,90,54,.11),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1120px] px-[clamp(20px,5vw,40px)]">
        <div className="mb-[clamp(36px,5vw,52px)] max-w-[660px]">
          <div className="mb-4 inline-flex items-center gap-2">
            <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
            <span className="text-green-bright font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em]">
              O dia a dia
            </span>
          </div>
          <h2 className="text-on-emerald mb-3.5 font-serif text-[clamp(30px,5vw,46px)] font-normal leading-[1.08] tracking-[-.02em]">
            {content.painsTitle}
          </h2>
          <p className="text-on-emerald-mut max-w-[520px] font-sans text-[17px] font-normal leading-[1.55]">
            {content.painsSubtitle}
          </p>
        </div>

        {/* minmax(min(100%,...)): 2 colunas no desktop (2x2), empilha no mobile sem media query. */}
        <div className="gap-4.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))]">
          {content.pains.map((p) => (
            <div
              key={p.complaint}
              className="bg-green-card border-on-emerald-mut/16 flex flex-col rounded-[20px] border p-[clamp(24px,2.6vw,30px)]"
            >
              <span className="bg-coral/13 mb-4 grid h-12 w-12 flex-none place-items-center rounded-[var(--radius-icontile)]">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--coral)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M9.5 5.5c-2.8 1-4.5 3.4-4.5 6.3V18h5.5v-6H7.2c0-2 .9-3.4 2.8-4.2Z" />
                  <path d="M19 5.5c-2.8 1-4.5 3.4-4.5 6.3V18H20v-6h-3.3c0-2 .9-3.4 2.8-4.2Z" />
                </svg>
              </span>
              {/* itálico serif carrega o "isso é fala de dono", sem aspas aninhadas na copy */}
              <p className="text-on-emerald mb-5 font-serif text-[19px] font-normal italic leading-[1.35]">
                {p.complaint}
              </p>
              <div className="border-on-emerald-mut/20 mt-auto flex items-start gap-2.5 border-t border-dashed pt-5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 flex-none"
                  aria-hidden
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
                <p className="text-on-emerald-mut font-sans text-[14.5px] font-normal leading-[1.6]">
                  {p.solution}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================ Recursos

const ICONS: Record<IconKey, ReactNode> = {
  team: (
    <>
      <path d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3.2" />
      <path d="M23 20v-2a4 4 0 0 0-3-3.8" />
      <path d="M16 3.5a4 4 0 0 1 0 7" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </>
  ),
  star: (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="M8.2 13.2 7 22l5-3 5 3-1.2-8.8" />
    </>
  ),
  repeat: (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  phone: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2.6" />
      <line x1="10" y1="18.5" x2="14" y2="18.5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6.5A1.5 1.5 0 0 0 5 3.5v17A1.5 1.5 0 0 0 6.5 22h11a1.5 1.5 0 0 0 1.5-1.5V7Z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.4" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
};

export function NicheFeatures({ content }: { content: NicheContent }) {
  return (
    <section id="recursos" className="py-[clamp(56px,7vw,88px)]">
      <div className="mx-auto max-w-[1120px] px-[clamp(20px,5vw,40px)]">
        <div className="mx-auto mb-[clamp(30px,4vw,42px)] max-w-[620px] text-center">
          <div className="mb-3.5 inline-flex items-center gap-2">
            <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
            <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
              Recursos
            </span>
          </div>
          <h2 className="text-green-deep mb-3 font-serif text-[clamp(28px,4.6vw,40px)] font-normal leading-[1.1] tracking-[-.02em]">
            {content.featuresTitle}
          </h2>
          <p className="text-ink-70 mx-auto max-w-[460px] font-sans text-[16.5px] font-normal leading-[1.55]">
            Tem mais coisa no produto. Esses são os que mudam o seu dia.
          </p>
        </div>

        <div className="gap-4.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,290px),1fr))]">
          {content.features.map((f) => (
            <div
              key={f.title}
              className="border-line bg-paper relative rounded-[20px] border p-[clamp(24px,2.4vw,30px)] shadow-[var(--shadow-card)]"
            >
              {f.time ? (
                <span className="bg-chip text-green-deep right-5.5 top-5.5 absolute rounded-full px-3 py-1 font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.06em]">
                  Time+
                </span>
              ) : null}
              <span className="bg-green-deep mb-4.5 h-11.5 w-11.5 grid place-items-center rounded-[var(--radius-icontile)]">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {ICONS[f.icon]}
                </svg>
              </span>
              <div className="text-green-deep mb-2 font-serif text-[18px] font-medium leading-[normal]">
                {f.title}
              </div>
              <p className="text-ink-70 font-sans text-[15px] font-normal leading-[1.55]">
                {f.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 text-center">
          {/* `!` na cor: `.dmd-home a { color: inherit }` vive fora de @layer no globals.css e
              vence @layer utilities - sem ele o link herda o ink do body. */}
          <a
            href="/funcionalidades"
            className="hv-coral text-green-deep! inline-flex items-center gap-2 font-sans text-[15px] font-bold leading-[normal]"
          >
            Ver tudo que vem dentro{' '}
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
