import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../../src/store/db.js';
import { addAccount, addSub, delSub, accountView } from '../../src/core/ledger.js';
import { addGoal, goalInfo, contribute, completeGoal } from '../../src/core/goals.js';

function base() {
  let s = initialState();
  s = addAccount(s, { name: 'Nubank', initial: 300000 }); const nu = s.accounts[0].id;
  s = addSub(s, nu, { name: 'Viagem', value: 20000 }); const via = s.accounts[0].subs[0].id;
  s = addAccount(s, { name: 'Santander', initial: 75000 }); const sa = s.accounts[1].id;
  return { s, nu, via, sa };
}
const TODAY = '2026-11-18';

test('progresso de meta ligada a subconta = saldo da subconta', () => {
  const { s, nu, via } = base();
  const r = addGoal(s, { name: 'Viagem', target: 100000, dest: { kind: 'sub', acc: nu, id: via }, color: '#2B4EFF' });
  const i = goalInfo(r, r.metas[0], TODAY);
  assert.equal(i.saved, 20000); assert.equal(Math.round(i.pct), 20);
});
test('meta ligada a conta usa o saldo total; ligada ao Livre usa o Livre', () => {
  const { s, nu, sa } = base();
  let r = addGoal(s, { name: 'Reserva', target: 150000, dest: { kind: 'acc', id: sa }, color: '#000' });
  r = addGoal(r, { name: 'Livre', target: 100000, dest: { kind: 'livre', acc: nu }, color: '#111' });
  assert.equal(goalInfo(r, r.metas[0], TODAY).saved, 75000);
  assert.equal(goalInfo(r, r.metas[1], TODAY).saved, 280000);
});
test('duas metas no mesmo destino lançam erro', () => {
  const { s, nu, via } = base();
  const r = addGoal(s, { name: 'A', target: 1, dest: { kind: 'sub', acc: nu, id: via }, color: '#0' });
  assert.throws(() => addGoal(r, { name: 'B', target: 1, dest: { kind: 'sub', acc: nu, id: via }, color: '#0' }), /mesmo destino/i);
});
test('prazo 2027-03 em 2026-11: guarde = falta ÷ 4 meses, arredondando para cima', () => {
  const { s, nu, via } = base();
  const r = addGoal(s, { name: 'V', target: 100001, deadline: '2027-03', dest: { kind: 'sub', acc: nu, id: via }, color: '#0' });
  assert.equal(goalInfo(r, r.metas[0], TODAY).perMonth, Math.ceil(80001 / 4));
});
test('destino apagado: meta mostra removido sem quebrar', () => {
  const { s, nu, via } = base();
  let r = addGoal(s, { name: 'V', target: 100000, dest: { kind: 'sub', acc: nu, id: via }, color: '#0' });
  r = delSub(r, nu, via);
  const i = goalInfo(r, r.metas[0], TODAY);
  assert.equal(i.removed, true); assert.equal(i.saved, 0); assert.equal(i.pct, 0);
});
test('guardar na meta move do Livre para o destino sem mudar o total', () => {
  const { s, nu, via } = base();
  let r = addGoal(s, { name: 'V', target: 100000, dest: { kind: 'sub', acc: nu, id: via }, color: '#0' });
  r = contribute(r, r.metas[0].id, 5000, nu, TODAY);
  assert.equal(goalInfo(r, r.metas[0], TODAY).saved, 25000);
  assert.equal(accountView(r, nu).total, 300000);
});
test('meta com alvo 0 não gera NaN; concluir marca a meta', () => {
  const { s, nu, via } = base();
  let r = addGoal(s, { name: 'V', target: 0, dest: { kind: 'sub', acc: nu, id: via }, color: '#0' });
  assert.ok(Number.isFinite(goalInfo(r, r.metas[0], TODAY).pct));
  r = completeGoal(r, r.metas[0].id); assert.equal(r.metas[0].done, true);
});
