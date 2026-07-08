// Config compartilhada do onboarding (wizard client + actions server). Não é
// 'use server' nem 'use client' - só dados. Serviços sugeridos por segmento; o
// server reconstrói as definições a partir das KEYS enviadas pelo cliente (o
// cliente nunca injeta nome/preço arbitrário).

export const SEGMENTS = ['Barbearia', 'Salão de beleza', 'Clínica', 'Estúdio', 'Outro'] as const;

export interface Suggestion {
  key: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

const SUGGESTIONS: Record<string, Suggestion[]> = {
  Barbearia: [
    { key: 'corte-m', name: 'Corte masculino', durationMinutes: 30, priceCents: 4500 },
    { key: 'barba', name: 'Barba', durationMinutes: 30, priceCents: 3500 },
    { key: 'combo', name: 'Combo cabelo + barba', durationMinutes: 60, priceCents: 7000 },
  ],
  'Salão de beleza': [
    { key: 'corte-f', name: 'Corte feminino', durationMinutes: 60, priceCents: 8000 },
    { key: 'escova', name: 'Escova', durationMinutes: 45, priceCents: 6000 },
    { key: 'coloracao', name: 'Coloração', durationMinutes: 120, priceCents: 15000 },
  ],
  Clínica: [
    { key: 'consulta', name: 'Consulta', durationMinutes: 30, priceCents: 15000 },
    { key: 'avaliacao', name: 'Avaliação', durationMinutes: 40, priceCents: 12000 },
    { key: 'retorno', name: 'Retorno', durationMinutes: 20, priceCents: 0 },
  ],
  Estúdio: [
    { key: 'sessao', name: 'Sessão', durationMinutes: 60, priceCents: 12000 },
    { key: 'retoque', name: 'Retoque', durationMinutes: 30, priceCents: 7000 },
  ],
};

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { key: 'atendimento', name: 'Atendimento', durationMinutes: 30, priceCents: 5000 },
];

export function suggestionsFor(segment: string | null | undefined): Suggestion[] {
  return (segment && SUGGESTIONS[segment]) || DEFAULT_SUGGESTIONS;
}

// Dias da semana no padrão Date#getDay() (0=domingo). Rótulos curtos p/ os chips.
export const WEEKDAYS = [
  { n: 0, label: 'Dom' },
  { n: 1, label: 'Seg' },
  { n: 2, label: 'Ter' },
  { n: 3, label: 'Qua' },
  { n: 4, label: 'Qui' },
  { n: 5, label: 'Sex' },
  { n: 6, label: 'Sáb' },
] as const;

// Horário padrão do onboarding (9h-19h). Refinável depois em Horários.
export const DEFAULT_START_MIN = 9 * 60;
export const DEFAULT_END_MIN = 19 * 60;
