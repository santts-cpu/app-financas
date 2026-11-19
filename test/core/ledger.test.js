import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../../src/store/db.js';
import { addAccount, addSub, editSub, delSub, accountView, transferBetweenSubs, adjustBalance } from '../../src/core/ledger.js';

function nubank() {
  let s = initialState();
  s = addAccount(s, { name: 'Nubank', initial: 120000 });
  const acc = s.accounts[0].id;
  s = addSub(s, acc, { name: 'Porquinho 1', value: 25000 });
  s = addSub(s, acc, { name: 'Viagem', value: 20000 });
  return { s, acc, p1: s.accounts[0].subs[0].id, via: s.accounts[0].subs[1].id };
}

test('Livre = total menos soma das subcontas', () => {
  const { s, acc } = nubank();
  const v = accountView(s, acc);
  assert.equal(v.total, 120000); assert.equal(v.livre, 75000);
});
test('transferir do Livre para subconta não muda o total', () => {
  const { s, acc, via } = nubank();
  const r = transferBetweenSubs(s, acc, 'livre', via, 5000);
  const v = accountView(r, acc);
  assert.equal(v.total, 120000); assert.equal(v.livre, 70000);
  assert.equal(v.subs.find(x => x.id === via).value, 25000);
});
test('transferir mais do que a subconta tem lança erro', () => {
  const { s, acc, p1, via } = nubank();
  assert.throws(() => transferBetweenSubs(s, acc, p1, via, 25001), /Valor maior que o da subconta/);
});
test('Livre negativo é permitido e aparece negativo', () => {
  const { s, acc } = nubank();
  const r = editSub(s, acc, s.accounts[0].subs[0].id, { value: 100000 });
  assert.equal(accountView(r, acc).livre, -0 + 120000 - 100000 - 20000);
});
test('ajustar saldo cria lançamento visível e muda o total pelo Livre', () => {
  const { s, acc } = nubank();
  const r = adjustBalance(s, acc, 130000);
  assert.equal(accountView(r, acc).total, 130000);
  assert.equal(accountView(r, acc).livre, 85000);
  const t = r.tx.at(-1);
  assert.equal(t.type, 'a'); assert.equal(t.value, 10000); assert.match(t.desc, /Ajuste de saldo/);
});
test('apagar subconta devolve o valor ao Livre', () => {
  const { s, acc, via } = nubank();
  const r = delSub(s, acc, via);
  assert.equal(accountView(r, acc).livre, 95000);
  assert.equal(r.accounts[0].subs.length, 1);
});
test('funções não alteram o estado original', () => {
  const { s, acc } = nubank();
  const antes = JSON.stringify(s);
  adjustBalance(s, acc, 1);
  assert.equal(JSON.stringify(s), antes);
});
