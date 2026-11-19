import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../../src/store/db.js';
import { addAccount, addSub, delSub } from '../../src/core/ledger.js';
import { addAsset, capItems, capByClass, capByLoc, capTotals, setClassMetas, linkAccount } from '../../src/core/capital.js';

function base() {
  let s = initialState();
  s.cap.classes = [{ n: 'Renda fixa', meta: 40, fora: false }, { n: 'FIIs', meta: 40, fora: false }, { n: 'Ações', meta: 20, fora: false }, { n: 'Reserva', meta: 0, fora: true }];
  s = addAsset(s, { name: 'Tesouro Selic', cls: 'Renda fixa', loc: 'Rico', value: 150000 });
  s = addAsset(s, { name: 'Carteira de FIIs', cls: 'FIIs', loc: 'Rico', value: 200000 });
  s = addAsset(s, { name: 'Carteira de ações', cls: 'Ações', loc: 'Inter', value: 50000 });
  s = addAccount(s, { name: 'Nubank', initial: 300000 }); const nu = s.accounts[0].id;
  s = addSub(s, nu, { name: 'Viagem', value: 20000 });
  return { s, nu, via: s.accounts[0].subs[0].id };
}

test('Reserva (fora) não entra na base das %', () => {
  let { s, nu } = base();
  s = linkAccount(s, { kind: 'livre', acc: nu });
  const rows = capByClass(s), rf = rows.find(r => r.cls === 'Renda fixa');
  assert.equal(Math.round(rf.pct), 38);  // 150000 / 400000
  assert.equal(rows.find(r => r.cls === 'Reserva').value, 280000);
});
test('desvio em pontos e em reais contra a meta', () => {
  const { s } = base();
  const fiis = capByClass(s).find(r => r.cls === 'FIIs');
  assert.equal(fiis.pct, 50); assert.equal(fiis.desvioPts, 10); assert.equal(fiis.desvioCents, 40000);
});
test('metas que não somam 100 lançam erro; 100 passa', () => {
  const { s } = base();
  assert.throws(() => setClassMetas(s, { 'Renda fixa': 50, FIIs: 40, Ações: 20 }), /100%/);
  const r = setClassMetas(s, { 'Renda fixa': 50, FIIs: 30, Ações: 20 });
  assert.equal(r.cap.classes[0].meta, 50);
});
test('item ligado lê o valor da conta, nunca digitado; subconta apagada some', () => {
  let { s, nu, via } = base();
  s = linkAccount(s, { kind: 'sub', acc: nu, id: via });
  assert.equal(capItems(s).find(i => i.linked).value, 20000);
  assert.equal(capItems(s).find(i => i.linked).cls, 'Reserva');
  s = delSub(s, nu, via);
  assert.ok(!capItems(s).some(i => i.linked));
});
test('por local: total e % do capital', () => {
  const { s } = base();
  const rico = capByLoc(s).find(l => l.loc === 'Rico');
  assert.equal(rico.value, 350000); assert.equal(Math.round(rico.pct), 88); assert.equal(rico.items.length, 2);
});
test('totais: investimentos + reserva = total; capital vazio não gera NaN', () => {
  let { s, nu } = base();
  s = linkAccount(s, { kind: 'livre', acc: nu });
  assert.deepEqual(capTotals(s), { investimentos: 400000, reserva: 280000, total: 680000 });
  const e = initialState();
  assert.ok(capByClass(e).every(r => r.fora ? r.pct === null : Number.isFinite(r.pct)));
  assert.deepEqual(capTotals(e), { investimentos: 0, reserva: 0, total: 0 });
});
test('classe nova criada com meta 0', () => {
  const { s } = base();
  const r = addAsset(s, { name: 'Bitcoin', cls: 'Cripto', loc: 'Binance', value: 1000 });
  assert.equal(r.cap.classes.find(c => c.n === 'Cripto').meta, 0);
});
