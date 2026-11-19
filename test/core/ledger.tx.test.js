import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../../src/store/db.js';
import { addAccount, addSub, accountView, addTx, effectTx, editTx, delTx, monthSummary } from '../../src/core/ledger.js';

function base() {
  let s = initialState();
  s = addAccount(s, { name: 'Nubank', initial: 120000 });
  const acc = s.accounts[0].id;
  s = addSub(s, acc, { name: 'Porquinho 1', value: 25000 });
  s = addAccount(s, { name: 'Santander', initial: 75000 });
  return { s, acc, sa: s.accounts[1].id, p1: s.accounts[0].subs[0].id };
}
const exp = (o) => ({ type: 'e', status: 'p', date: '2026-11-10', desc: 'x', cat: 'Alimentação', ...o });

test('despesa paga de subconta reduz total e subconta, Livre não muda', () => {
  const { s, acc, p1 } = base();
  const r = addTx(s, exp({ acc, sub: p1, value: 4290 }));
  const v = accountView(r, acc);
  assert.equal(v.total, 115710); assert.equal(v.subs[0].value, 20710); assert.equal(v.livre, 95000);
  assert.equal(v.livre, accountView(s, acc).livre);
});
test('despesa pendente não muda nada até efetivar', () => {
  const { s, acc } = base();
  let r = addTx(s, exp({ acc, value: 5000, status: 'n' }));
  assert.equal(accountView(r, acc).total, 120000);
  r = effectTx(r, r.tx[0].id);
  assert.equal(accountView(r, acc).total, 115000);
  assert.equal(r.tx[0].status, 'p');
});
test('transferência entre contas não entra em despesas nem receitas', () => {
  const { s, acc, sa } = base();
  const r = addTx(s, { type: 't', status: 'p', date: '2026-11-10', from: acc, to: sa, value: 10000, desc: 'Transf' });
  assert.equal(accountView(r, acc).total, 110000); assert.equal(accountView(r, sa).total, 85000);
  const m = monthSummary(r, '2026-11');
  assert.equal(m.despesas, 0); assert.equal(m.receitas, 0);
});
test('editar e excluir lançamento pago antigo recalcula saldo e subconta', () => {
  const { s, acc, p1 } = base();
  let r = addTx(s, exp({ acc, sub: p1, value: 4290, date: '2026-01-05' }));
  const id = r.tx[0].id;
  r = editTx(r, id, { value: 1000 });
  assert.equal(accountView(r, acc).total, 119000); assert.equal(accountView(r, acc).subs[0].value, 24000);
  r = delTx(r, id);
  assert.equal(accountView(r, acc).total, 120000); assert.equal(accountView(r, acc).subs[0].value, 25000);
});
test('monthSummary separa pagos e pendentes', () => {
  const { s, acc } = base();
  let r = addTx(s, exp({ acc, value: 3000 }));
  r = addTx(r, { type: 'r', status: 'p', date: '2026-11-05', acc, value: 420000, desc: 'Salário', cat: 'Salário' });
  r = addTx(r, exp({ acc, value: 7000, status: 'n' }));
  r = addTx(r, { type: 'r', status: 'n', date: '2026-11-25', acc, value: 60000, desc: 'Freela', cat: 'Salário' });
  r = addTx(r, exp({ acc, value: 999, date: '2026-10-30' }));
  const m = monthSummary(r, '2026-11');
  assert.deepEqual(m, { receitas: 420000, despesas: 3000, resultado: 417000, aReceber: 60000, aPagar: 7000, pendentes: 2 });
});
test('addTx recusa valor não positivo', () => {
  const { s, acc } = base();
  assert.throws(() => addTx(s, exp({ acc, value: 0 })), /valor/i);
});
