// Núcleo PURO do cálculo de comissão (sem DB, sem server-only) - testável com tsx. É uma CAMADA
// EM CIMA do motor de métricas, nunca fonte paralela: recebe `revenueCents`/`count` que vieram
// de getMetrics({professionalId}) e aplica o modelo de remuneração do profissional.
//
// Aluguel de cadeira INVERTE o fluxo: o profissional fica com 100% do serviço e a CASA recebe o
// aluguel. Por isso separamos "gerado" (bruto, = faturamento do motor) de "líquido da casa" e do
// "acerto" (settlement) - o faturamento do estabelecimento no motor NÃO muda (segue bruto).

import type { CompensationModel } from '@haru/database';
import { formatBRL } from '@haru/shared';

export const COMPENSATION_MODEL_LABEL: Record<CompensationModel, string> = {
  COMMISSION_PERCENT: 'Comissão (% do serviço)',
  FIXED_PER_SERVICE: 'Valor fixo por atendimento',
  CHAIR_RENT: 'Aluguel de cadeira',
};

export interface CompensationConfig {
  model: CompensationModel;
  commissionPercent: number | null;
  fixedPerServiceCents: number | null;
  chairRentCents: number | null;
}

/** PAY = a casa paga o profissional; RECEIVE = a casa recebe do profissional (aluguel); NONE = nada a acertar. */
export type SettlementDirection = 'PAY' | 'RECEIVE' | 'NONE';

export interface CommissionResult {
  /** false = dono ainda não definiu o modelo deste profissional. */
  configured: boolean;
  model: CompensationModel | null;
  /** Bruto gerado pelo profissional no período (do motor). */
  revenueCents: number;
  /** Atendimentos realizados no período (do motor). */
  count: number;
  /** Quanto fica com o profissional. */
  professionalCents: number;
  /** Líquido da casa referente a este profissional (aluguel, no caso de cadeira). */
  houseCents: number;
  /** O que muda de mão no fechamento. */
  settlement: { direction: SettlementDirection; cents: number };
}

/** Descrição curta PT-BR do modelo configurado (pro card/tabela). */
export function describeCompensation(config: CompensationConfig | null): string {
  if (!config) return 'Não definido';
  switch (config.model) {
    case 'COMMISSION_PERCENT':
      return `${config.commissionPercent ?? 0}% por serviço`;
    case 'FIXED_PER_SERVICE':
      return `${formatBRL(config.fixedPerServiceCents ?? 0)} por atendimento`;
    case 'CHAIR_RENT':
      return `Aluguel ${formatBRL(config.chairRentCents ?? 0)}/mês`;
  }
}

const clampPct = (p: number): number => Math.max(0, Math.min(100, Math.round(p)));

/**
 * Comissão de UM profissional num período, dado o modelo e os números do motor. Único lugar
 * que traduz modelo -> quanto é de quem.
 */
export function computeCommission(
  config: CompensationConfig | null,
  revenueCents: number,
  count: number,
): CommissionResult {
  if (!config) {
    return {
      configured: false,
      model: null,
      revenueCents,
      count,
      professionalCents: 0,
      houseCents: revenueCents,
      settlement: { direction: 'NONE', cents: 0 },
    };
  }

  switch (config.model) {
    case 'COMMISSION_PERCENT': {
      const pct = clampPct(config.commissionPercent ?? 0);
      const professionalCents = Math.round((revenueCents * pct) / 100);
      return {
        configured: true,
        model: config.model,
        revenueCents,
        count,
        professionalCents,
        houseCents: revenueCents - professionalCents,
        settlement: { direction: professionalCents > 0 ? 'PAY' : 'NONE', cents: professionalCents },
      };
    }
    case 'FIXED_PER_SERVICE': {
      const fixed = Math.max(0, config.fixedPerServiceCents ?? 0);
      const professionalCents = fixed * count;
      // Se o fixo passar do bruto (raro), a casa fica no vermelho neste pro - mostrado honesto.
      return {
        configured: true,
        model: config.model,
        revenueCents,
        count,
        professionalCents,
        houseCents: revenueCents - professionalCents,
        settlement: { direction: professionalCents > 0 ? 'PAY' : 'NONE', cents: professionalCents },
      };
    }
    case 'CHAIR_RENT': {
      const rent = Math.max(0, config.chairRentCents ?? 0);
      // Fluxo invertido: o profissional fica com TODO o serviço; a casa recebe o aluguel.
      return {
        configured: true,
        model: config.model,
        revenueCents,
        count,
        professionalCents: revenueCents,
        houseCents: rent,
        settlement: { direction: rent > 0 ? 'RECEIVE' : 'NONE', cents: rent },
      };
    }
  }
}

export interface CommissionTotals {
  /** Bruto gerado por todos os profissionais no período. */
  revenueCents: number;
  /** Soma do que a casa PAGA (percentual + fixo). */
  totalPayCents: number;
  /** Soma do que a casa RECEBE (aluguéis). */
  totalReceiveCents: number;
  /** Saldo do acerto pra casa: recebe - paga. Negativo = a casa desembolsa no líquido. */
  netCents: number;
}

/** Consolida uma lista de resultados de comissão pro fechamento do período. */
export function summarizeCommissions(results: CommissionResult[]): CommissionTotals {
  let revenueCents = 0;
  let totalPayCents = 0;
  let totalReceiveCents = 0;
  for (const r of results) {
    revenueCents += r.revenueCents;
    if (r.settlement.direction === 'PAY') totalPayCents += r.settlement.cents;
    else if (r.settlement.direction === 'RECEIVE') totalReceiveCents += r.settlement.cents;
  }
  return {
    revenueCents,
    totalPayCents,
    totalReceiveCents,
    netCents: totalReceiveCents - totalPayCents,
  };
}
