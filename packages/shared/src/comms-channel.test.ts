// Self-check do seletor own-channels-first (parte pura). Roda com:
//   tsx packages/shared/src/comms-channel.test.ts

import { pickChannels } from './comms-channel';

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else passed++;
}

// --- Fallback (own-first): WhatsApp é o ÚLTIMO recurso ---
const all = pickChannels({ push: true, email: true, whatsapp: true });
assert(all.push && all.email && !all.whatsapp, 'com push+email, WhatsApp NÃO sai');
assert(all.primary === 'PUSH', 'primary = push quando há push');

const emailOnly = pickChannels({ push: false, email: true, whatsapp: true });
assert(!emailOnly.whatsapp, 'com só e-mail (sem push), WhatsApp NÃO sai (own-first)');
assert(emailOnly.primary === 'EMAIL', 'primary = email quando há e-mail sem push');

const noOwn = pickChannels({ push: false, email: false, whatsapp: true });
assert(noOwn.whatsapp, 'sem push nem e-mail, WhatsApp SAI (fallback garantido)');
assert(noOwn.primary === 'WHATSAPP', 'primary = whatsapp quando é o único elegível');

const nothing = pickChannels({ push: false, email: false, whatsapp: false });
assert(!nothing.push && !nothing.email && !nothing.whatsapp, 'sem canal elegível, nada sai');
assert(nothing.primary === 'NONE', 'primary = none quando nenhum canal alcança');

// --- whatsappAlways: reforço/garantia junto do canal próprio ---
const always = pickChannels({ push: true, email: false, whatsapp: true }, { whatsappAlways: true });
assert(always.push && always.whatsapp, 'whatsappAlways: WhatsApp sai JUNTO do push');
assert(always.primary === 'PUSH', 'whatsappAlways: primary continua sendo o canal próprio (push)');

const alwaysNoWa = pickChannels({ push: true, email: false, whatsapp: false }, { whatsappAlways: true });
assert(!alwaysNoWa.whatsapp, 'whatsappAlways NÃO inventa WhatsApp quando ele não é elegível (sem telefone/opt-out)');

console.log(`OK - ${passed} asserts`);
