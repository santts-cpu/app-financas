import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../../src/store/db.js';
import { addAccount, accountView } from '../../src/core/ledger.js';
import { addAssin, setAssinStatus, nextCharges, assinTotal, generateMonth, useFavorite } from '../../src/core/subs.js';

function base() {
  let s = initialState();
  s = addAccount(s, { name: 'Nubank', initial: 100000 });
  const acc = s.accounts[0].id, from = { kind: 'acc', id: acc };
  s = addAssin(s, { name: 'Hospedagem', value: 3999, day: 20, from });
  s = addAssin(s, { name: 'Academia', value: 4154, day: 5, from });
  s = addAssin(s, { name: 'Nuvem', value: 3537, day: 25, from: { kind: 'card', id: 77 } });
  return { s, acc, from };
}

test('dia 29 em diante é rejeitado', () => {
  const { s, from } = base();
  assert.throws(() => addAssin(s, { name: 'X', value: 1, day: 29, from }), /1 a 28/);
  assert.throws(() => addAssin(s, { name: 'X', value: 1, day: 0, from }), /1 a 28/);
});
test('próximas cobranças em ordem de data, virando o mês', () => {
  const { s } = base();
  const n = nextCharges(s, '2026-11-18');
  assert.deepEqual(n.map(o => [o.assin.name, o.date]), [['Hospedagem', '2026-11-20'], ['Nuvem', '2026-11-25'], ['Academia', '2026-12-05']]);
});
test('total por mês e por ano só das ativas', () => {
  let { s } = base();
  s = setAssinStatus(s, s.assin[1].id, 'pausada');
  assert.deepEqual(assinTotal(s), { month: 7536, year: 7536 * 12 });
});
test('gerar o mês cria um pendente por ativa e rodar duas vezes não duplica', () => {
  const { s } = base();
  let r = generateMonth(s, '2026-11'); r = generateMonth(r, '2026-11');
  assert.equal(r.tx.length, 3);
  assert.ok(r.tx.every(t => t.status === 'n' && t.cat === 'Assinaturas' && t.type === 'e'));
  assert.equal(r.tx.find(t => t.desc === 'Nuvem').card, 77);
  assert.equal(r.tx.find(t => t.desc === 'Hospedagem').date, '2026-11-20');
});
test('pausadas e canceladas não geram cobrança', () => {
  let { s } = base();
  s = setAssinStatus(s, s.assin[0].id, 'cancelada'); s = setAssinStatus(s, s.assin[1].id, 'pausada');
  assert.equal(generateMonth(s, '2026-11').tx.length, 1);
});
test('favorita lança com a data de hoje e já como pago', () => {
  let { s, acc } = base();
  s.favs.push({ id: 500, desc: 'Pizza', cat: 'Alimentação', value: 4290, acc });
  const r = useFavorite(s, 500, '2026-11-18');
  assert.equal(r.tx.at(-1).date, '2026-11-18'); assert.equal(r.tx.at(-1).status, 'p');
  assert.equal(accountView(r, acc).total, 100000 - 4290);
});
