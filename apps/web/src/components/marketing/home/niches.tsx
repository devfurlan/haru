const chip =
  'inline-flex flex-none items-center gap-2 mr-3 py-3 px-4.5 bg-paper border border-line rounded-full';
const chipLabel =
  'font-sans text-[14.5px] leading-[normal] font-semibold text-ink-70 whitespace-nowrap';

export function Niches() {
  return (
    <section className="pb-[clamp(30px,4vw,46px)] pt-[clamp(6px,1.5vw,16px)]">
      <div className="mx-auto mb-[clamp(22px,3vw,30px)] max-w-[1120px] px-[clamp(20px,5vw,40px)] text-center">
        <div className="mb-3 inline-flex items-center gap-2">
          <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
          <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
            Todo tipo de negócio
          </span>
          <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
        </div>
        <p className="text-green-deep mx-auto max-w-[660px] font-serif text-[clamp(19px,2.6vw,24px)] font-normal leading-[1.35] tracking-[-.01em]">
          Se você trabalha com hora marcada, o Demanda
          <span className="text-coral">ê</span> serve pra{' '}
          <span className="italic text-[#0C7E41]">você</span>.
        </p>
      </div>

      <div className="overflow-hidden [-webkit-mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)] [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]">
        <div className="hv-pause flex w-max animate-[dmd-marquee_46s_linear_infinite]">
          {/* SET 1 */}
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
            <span className={chipLabel}>Barbearia</span>
          </span>
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9h18V7.5A1.5 1.5 0 0 0 19.5 6H4.5A1.5 1.5 0 0 0 3 7.5z" />
              <path d="M6.5 9v9M10 9v6.5M13.5 9v9M17 9v6.5" />
            </svg>
            <span className={chipLabel}>Salão</span>
          </span>
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3v5a4 4 0 0 0 8 0V3" />
              <path d="M6 3H4.7M14 3h1.3" />
              <path d="M10 12v1.5a4.5 4.5 0 0 0 4.5 4.5 3 3 0 0 0 3-3v-1" />
              <circle cx="18.5" cy="12" r="1.8" />
            </svg>
            <span className={chipLabel}>Clínica</span>
          </span>
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
              <path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
            </svg>
            <span className={chipLabel}>Estética</span>
          </span>
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8.5 20c-2.2 0-3.5-1.6-3.5-3.6 0-1.6.8-2.4.8-4.4 0-2.6 1.4-5 3.7-5 1.9 0 2.7 1.6 2.7 3.4 0 1.8-.6 2.6-.6 4.6 0 3 .7 5-3.1 5z" />
              <circle cx="15.5" cy="7" r="1.1" />
              <circle cx="17" cy="10" r="1" />
              <circle cx="16.8" cy="13" r="1" />
            </svg>
            <span className={chipLabel}>Podologia</span>
          </span>
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15.5 4.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4z" />
              <path d="M13.5 6.5 17.5 10.5" />
            </svg>
            <span className={chipLabel}>Tatuagem</span>
          </span>
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6.5 8v8M4 9.5v5M17.5 8v8M20 9.5v5M8 12h8" />
            </svg>
            <span className={chipLabel}>Fisioterapia</span>
          </span>
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="13" cy="4" r="1.8" />
              <path d="M4 17l5 1 .75-1.5" />
              <path d="M15 21v-4l-4-3 1-6" />
              <path d="M7 12V9l5-1 3 3 3 1" />
            </svg>
            <span className={chipLabel}>Personal trainer</span>
          </span>
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8.5C10.8 6 6 6.2 6 10.5 6 15 9 20 12 20s6-5 6-9.5c0-4.3-4.8-4.5-6-2z" />
              <path d="M12 8.5c0-2 1.2-3.4 3-3.8" />
            </svg>
            <span className={chipLabel}>Nutrição</span>
          </span>
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 6.5a3 3 0 0 0-5.6-1.4A2.7 2.7 0 0 0 4.8 9.9a2.7 2.7 0 0 0 1.3 4.4A2.3 2.3 0 0 0 10 16.4" />
              <path d="M12 6.5a3 3 0 0 1 5.6-1.4A2.7 2.7 0 0 1 19.2 9.9a2.7 2.7 0 0 1-1.3 4.4A2.3 2.3 0 0 1 14 16.4" />
              <path d="M12 6.5v10" />
            </svg>
            <span className={chipLabel}>Psicologia</span>
          </span>
          <span className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 9a2 2 0 0 1 2-2h1.2l.9-1.4A1 1 0 0 1 9 5h6a1 1 0 0 1 .9.6L16.8 7H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <span className={chipLabel}>Estúdio</span>
          </span>
          {/* SET 2 (loop) */}
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
            <span className={chipLabel}>Barbearia</span>
          </span>
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9h18V7.5A1.5 1.5 0 0 0 19.5 6H4.5A1.5 1.5 0 0 0 3 7.5z" />
              <path d="M6.5 9v9M10 9v6.5M13.5 9v9M17 9v6.5" />
            </svg>
            <span className={chipLabel}>Salão</span>
          </span>
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3v5a4 4 0 0 0 8 0V3" />
              <path d="M6 3H4.7M14 3h1.3" />
              <path d="M10 12v1.5a4.5 4.5 0 0 0 4.5 4.5 3 3 0 0 0 3-3v-1" />
              <circle cx="18.5" cy="12" r="1.8" />
            </svg>
            <span className={chipLabel}>Clínica</span>
          </span>
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
              <path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
            </svg>
            <span className={chipLabel}>Estética</span>
          </span>
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8.5 20c-2.2 0-3.5-1.6-3.5-3.6 0-1.6.8-2.4.8-4.4 0-2.6 1.4-5 3.7-5 1.9 0 2.7 1.6 2.7 3.4 0 1.8-.6 2.6-.6 4.6 0 3 .7 5-3.1 5z" />
              <circle cx="15.5" cy="7" r="1.1" />
              <circle cx="17" cy="10" r="1" />
              <circle cx="16.8" cy="13" r="1" />
            </svg>
            <span className={chipLabel}>Podologia</span>
          </span>
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15.5 4.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4z" />
              <path d="M13.5 6.5 17.5 10.5" />
            </svg>
            <span className={chipLabel}>Tatuagem</span>
          </span>
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6.5 8v8M4 9.5v5M17.5 8v8M20 9.5v5M8 12h8" />
            </svg>
            <span className={chipLabel}>Fisioterapia</span>
          </span>
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="13" cy="4" r="1.8" />
              <path d="M4 17l5 1 .75-1.5" />
              <path d="M15 21v-4l-4-3 1-6" />
              <path d="M7 12V9l5-1 3 3 3 1" />
            </svg>
            <span className={chipLabel}>Personal trainer</span>
          </span>
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8.5C10.8 6 6 6.2 6 10.5 6 15 9 20 12 20s6-5 6-9.5c0-4.3-4.8-4.5-6-2z" />
              <path d="M12 8.5c0-2 1.2-3.4 3-3.8" />
            </svg>
            <span className={chipLabel}>Nutrição</span>
          </span>
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 6.5a3 3 0 0 0-5.6-1.4A2.7 2.7 0 0 0 4.8 9.9a2.7 2.7 0 0 0 1.3 4.4A2.3 2.3 0 0 0 10 16.4" />
              <path d="M12 6.5a3 3 0 0 1 5.6-1.4A2.7 2.7 0 0 1 19.2 9.9a2.7 2.7 0 0 1-1.3 4.4A2.3 2.3 0 0 1 14 16.4" />
              <path d="M12 6.5v10" />
            </svg>
            <span className={chipLabel}>Psicologia</span>
          </span>
          <span aria-hidden="true" className={chip}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 9a2 2 0 0 1 2-2h1.2l.9-1.4A1 1 0 0 1 9 5h6a1 1 0 0 1 .9.6L16.8 7H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <span className={chipLabel}>Estúdio</span>
          </span>
        </div>
      </div>
    </section>
  );
}
