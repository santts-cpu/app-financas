import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../../src/store/db.js';
import { setPin, checkPin, hasPin, clearPin } from '../../src/core/lock.js';

test('PIN de 4 dígitos funciona e erra com outro', () => {
  const s = setPin(initialState(), '1234');
  assert.equal(hasPin(s), true); assert.equal(checkPin(s, '1234'), true); assert.equal(checkPin(s, '1235'), false);
});
test('PIN com 3 dígitos ou letras é recusado', () => {
  assert.throws(() => setPin(initialState(), '123'), /4 números/);
  assert.throws(() => setPin(initialState(), 'abcd'), /4 números/);
});
test('o PIN não fica guardado em texto puro', () => {
  assert.ok(!JSON.stringify(setPin(initialState(), '1234')).includes('1234'));
});
test('remover o PIN exige o PIN atual', () => {
  const s = setPin(initialState(), '1234');
  assert.throws(() => clearPin(s, '0000'), /incorreta/i);
  assert.equal(hasPin(clearPin(s, '1234')), false);
});
