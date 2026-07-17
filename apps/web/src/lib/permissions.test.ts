// Self-check da matriz de permissões. Roda com:
//   tsx apps/web/src/lib/permissions.test.ts

import assert from 'node:assert/strict';

import { canManageShop, canSeeMoney, dataScope, panelRole } from './permissions';

// ── Derivação do papel ──────────────────────────────────────────────────────────
assert.equal(panelRole({ role: 'OWNER', isProfessional: true }), 'OWNER'); // dono também atende
assert.equal(panelRole({ role: 'OWNER', isProfessional: false }), 'OWNER');
assert.equal(panelRole({ role: 'STAFF', isProfessional: true }), 'PROFESSIONAL');
assert.equal(panelRole({ role: 'STAFF', isProfessional: false }), 'SUPPORT');

// ── Dinheiro: só o dono ─────────────────────────────────────────────────────────
assert.equal(canSeeMoney('OWNER'), true);
assert.equal(canSeeMoney('PROFESSIONAL'), false);
assert.equal(canSeeMoney('SUPPORT'), false);

// ── Configuração do negócio: só o dono ──────────────────────────────────────────
assert.equal(canManageShop('OWNER'), true);
assert.equal(canManageShop('PROFESSIONAL'), false);
assert.equal(canManageShop('SUPPORT'), false);

// ── Alcance dos dados: profissional só o próprio; dono e apoio tudo ──────────────
assert.equal(dataScope('OWNER'), 'all');
assert.equal(dataScope('SUPPORT'), 'all'); // recepção vê a agenda de todos
assert.equal(dataScope('PROFESSIONAL'), 'own'); // profissional só a própria

console.log('permissions: OK');
