// Self-check do gatilho do convite (parte pura). Roda com:
//   tsx apps/web/src/lib/comms/review-invite.test.ts

import { isInvitable, reviewInviteWindow, REVIEW_INVITE_DELAY_HOURS } from './review-invite-core';

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else passed++;
}

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-07-16T18:00:00.000Z');
const ago = (h: number) => new Date(now.getTime() - h * HOUR);

// Janela: [now-(delay+6h), now-delay]. delay = 1h.
{
  const { lower, upper } = reviewInviteWindow(now);
  assert(upper.getTime() === now.getTime() - REVIEW_INVITE_DELAY_HOURS * HOUR, 'upper = now-delay');
  assert(
    lower.getTime() === now.getTime() - (REVIEW_INVITE_DELAY_HOURS + 6) * HOUR,
    'lower = now-delay-6h',
  );
}

// Terminou há 1h30: dentro da janela e "compareceu" -> convida. E vale pros 3 status de
// "compareceu" (o ponto do veredito: NÃO depende de COMPLETED).
for (const status of ['PENDING', 'CONFIRMED', 'COMPLETED']) {
  assert(isInvitable({ status, endsAt: ago(1.5) }, now), `${status} há 1h30 -> convida`);
}

// Muito recente (10min): antes do delay de 1h -> ainda não.
assert(!isInvitable({ status: 'COMPLETED', endsAt: ago(1 / 6) }, now), 'há 10min -> cedo demais');

// Muito antigo (8h): antes do lower da janela -> não (evita enxurrada do passado).
assert(!isInvitable({ status: 'COMPLETED', endsAt: ago(8) }, now), 'há 8h -> fora da janela');

// Cancelado / falta: nunca convida, mesmo dentro da janela.
assert(!isInvitable({ status: 'CANCELED', endsAt: ago(1.5) }, now), 'CANCELED -> não convida');
assert(!isInvitable({ status: 'NO_SHOW', endsAt: ago(1.5) }, now), 'NO_SHOW -> não convida');

// Borda: exatamente em now-delay (upper) entra; exatamente em now-delay-6h (lower) entra.
assert(isInvitable({ status: 'CONFIRMED', endsAt: ago(1) }, now), 'na borda upper -> convida');
assert(isInvitable({ status: 'CONFIRMED', endsAt: ago(7) }, now), 'na borda lower -> convida');

console.log(`ok - ${passed} asserts`);
