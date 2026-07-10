/**
 * Self-check das funções puras de máscara/gating do cartão. Sem framework: roda com
 *   node --experimental-strip-types apps/web/src/lib/card-format.check.mts
 * Falha (exit 1) se a lógica do form quebrar. É a única coisa que precisa passar aqui.
 */
import assert from 'node:assert/strict';

import {
  cardLast4,
  isCardComplete,
  isExpiryValid,
  maskCardNumber,
  maskCep,
  maskExpiry,
  type CardForm,
} from './card-format.ts';

assert.equal(maskCardNumber('4242424242424242'), '4242 4242 4242 4242');
assert.equal(maskCardNumber('42a42B4242'), '4242 4242'); // ignora não-dígitos
assert.equal(maskCardNumber('42424242424242424242999'), '4242 4242 4242 4242 424'); // corta em 19

assert.equal(maskExpiry('1'), '1');
assert.equal(maskExpiry('12'), '12');
assert.equal(maskExpiry('1228'), '12/28');
assert.equal(maskExpiry('12/2812'), '12/28'); // corta em 4 dígitos

assert.equal(maskCep('13458000'), '13458-000');
assert.equal(cardLast4('4242 4242 4242 1234'), '1234');

assert.equal(isExpiryValid('12/28'), true);
assert.equal(isExpiryValid('13/28'), false); // mês inválido
assert.equal(isExpiryValid('00/28'), false);
assert.equal(isExpiryValid('1228'), false); // sem barra

const complete: CardForm = {
  number: '4242 4242 4242 4242',
  exp: '12/28',
  cvv: '123',
  name: 'LUCAS FURLAN',
  cpfCnpj: '390.533.447-05', // CPF com máscara (11 dígitos)
  cep: '13458-000',
  addressNumber: '50',
};
assert.equal(isCardComplete(complete), true);
assert.equal(isCardComplete({ ...complete, cvv: '12' }), false); // CVV curto
assert.equal(isCardComplete({ ...complete, exp: '13/28' }), false); // mês inválido
assert.equal(isCardComplete({ ...complete, cpfCnpj: '123' }), false); // doc curto
assert.equal(isCardComplete({ ...complete, cep: '1345' }), false); // CEP curto
assert.equal(isCardComplete({ ...complete, addressNumber: '' }), false); // sem número

console.log('card-format self-check OK');
