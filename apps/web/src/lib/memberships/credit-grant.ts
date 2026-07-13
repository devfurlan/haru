// Cálculo PURO da recarga de créditos no início de cada ciclo pago. Sem I/O - a aplicação
// (webhook-apply) grava o ledger (EXPIRE do não-usado + CYCLE_GRANT) e o cache creditBalance
// a partir daqui. Mantido puro pra ter self-check sem banco (a regra de acúmulo/teto/reset é
// dinheiro, então tem que ser provada).

export interface CreditGrant {
  /** Saldo após a recarga (vira Membership.creditBalance). */
  newBalance: number;
  /** Créditos concedidos neste ciclo (linha CYCLE_GRANT do ledger; >= 0). */
  grantDelta: number;
  /** Créditos que venceram do ciclo anterior (linha EXPIRE; <= 0). 0 quando acumula. */
  expiredDelta: number;
}

/**
 * Recarga de um ciclo:
 * - creditRollover=false (vence): o não-usado EXPIRA e o saldo volta a `creditsPerCycle`.
 * - creditRollover=true (acumula): soma `creditsPerCycle` ao saldo, limitado a `rolloverCap`
 *   (null = sem teto). Se o saldo já bateu no teto, concede 0.
 *
 * Invariante: newBalance == currentBalance + grantDelta + expiredDelta (o ledger fecha com o
 * cache). grantDelta nunca é negativo; expiredDelta nunca é positivo.
 */
export function computeGrant(
  currentBalance: number,
  creditsPerCycle: number,
  creditRollover: boolean,
  rolloverCap: number | null,
): CreditGrant {
  const balance = Math.max(0, currentBalance);

  if (!creditRollover) {
    return {
      expiredDelta: balance > 0 ? -balance : 0,
      grantDelta: creditsPerCycle,
      newBalance: creditsPerCycle,
    };
  }

  const uncapped = balance + creditsPerCycle;
  const capped = rolloverCap != null ? Math.min(uncapped, rolloverCap) : uncapped;
  const grantDelta = Math.max(0, capped - balance);
  return { expiredDelta: 0, grantDelta, newBalance: balance + grantDelta };
}
