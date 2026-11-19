import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, load, save, clear, requestPersist } from '../../src/store/db.js';

test('load sem nada devolve o estado inicial', async () => {
  await clear();
  assert.deepEqual(await load(), initialState());
});
test('save depois load devolve estado igual', async () => {
  const s = initialState(); s.tx.push({ id: 1, value: 4290, desc: 'Pizza' });
  await save(s);
  assert.deepEqual(await load(), s);
});
test('clear volta ao inicial', async () => {
  await save({ ...initialState(), tx: [{ id: 9 }] });
  await clear();
  assert.deepEqual(await load(), initialState());
});
test('requestPersist devolve false sem navigator.storage', async () => {
  assert.equal(await requestPersist(), false);
});
test('estado inicial tem barra padrão de 5 abas e começa vazio', () => {
  const s = initialState();
  assert.deepEqual(s.bar, ['inicio', 'lanc', 'contas', 'plano', 'capital']);
  assert.equal(s.tx.length, 0);
});
