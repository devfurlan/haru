// Núcleo PURO do convite de avaliação (sem IO, sem 'server-only') - testável com tsx
// (ver review-invite.test.ts). O IO (query + fan-out) vive em review-invite.ts.

/** Horas após o FIM do atendimento pra convidar. Único lugar pra ajustar o timing. */
export const REVIEW_INVITE_DELAY_HOURS = 1;

/**
 * Folga inferior da janela de varredura. Limita o scan (não varre o passado inteiro - a
 * coluna reviewInviteSentAt nasce null pra todo mundo) e dá ~6 retries com o cron hourly
 * antes do atendimento sair da janela. O carimbo reviewInviteSentAt é o dedup forte.
 */
const WINDOW_SLACK_HOURS = 6;

const HOUR_MS = 60 * 60 * 1000;

/** Janela de varredura do cron: atendimentos com `endsAt` em `[now-(delay+slack), now-delay]`. */
export function reviewInviteWindow(now: Date): { lower: Date; upper: Date } {
  const upper = new Date(now.getTime() - REVIEW_INVITE_DELAY_HOURS * HOUR_MS);
  const lower = new Date(
    now.getTime() - (REVIEW_INVITE_DELAY_HOURS + WINDOW_SLACK_HOURS) * HOUR_MS,
  );
  return { lower, upper };
}

/**
 * Espelho puro do `where` do cron: dentro da janela e status não cancelado/falta. NÃO exige
 * COMPLETED de propósito - COMPLETED, CONFIRMED e PENDING passados são todos "compareceu"
 * (mesma regra do isReviewable). Usar `= COMPLETED` daria falso-negativo na janela pré-cron;
 * usar `IN (PENDING,CONFIRMED)` dropava os já-fechados pelo cron de fim de dia.
 */
export function isInvitable(appt: { status: string; endsAt: Date }, now: Date): boolean {
  const { lower, upper } = reviewInviteWindow(now);
  return (
    appt.endsAt >= lower &&
    appt.endsAt <= upper &&
    appt.status !== 'CANCELED' &&
    appt.status !== 'NO_SHOW'
  );
}
