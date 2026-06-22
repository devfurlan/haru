/** Formata um custo em USD (ex.: 0.0123 -> "US$ 0,0123"). */
export function formatUsd(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: 4,
  }).format(value);
}

/** Inteiro com separador de milhar pt-BR (ex.: 12345 -> "12.345"). */
export function formatInt(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

/** Fração 0..1 como percentual (ex.: 0.732 -> "73%"). */
export function formatPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
