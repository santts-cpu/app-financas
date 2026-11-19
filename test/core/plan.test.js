import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../../src/store/db.js';
import { addAccount, addSub, addTx, accountView } from '../../src/core/ledger.js';
import { planRows, groupState, copyPlan, setCatGroup, alertRows, alertKey, dismissAlert, saveLeftover } from '../../src/core/plan.js';

const K = '2026-11';
function base() {
  let s = initialState();
  s = addAccount(s, { name: 'Nubank', initial: 500000 }); const acc = s.accounts[0].id;
  s = addSub(s, acc, { name: 'Viagem', value: 0 });
  s.plans[K] = { auto: false, renda: 420000, groups: [{ id: 'cv', n: 'Custo de Vida', p: 50 }, { id: 'pf', n: 'Projetos/Futuro', p: 20 }, { id: 'la', n: 'Lazer', p: 30 }],
    catGrp: { Mercado: 'cv', Aluguel: 'cv', Eletrônicos: 'pf' } };
  const e = (cat, value, status) => ({ type: 'e', status, date: '2026-11-10', acc, value, desc: cat, cat });
  s = addTx(s, e('Mercado', 164000, 'p')); s = addTx(s, e('Aluguel', 32995, 'n'));
  s = addTx(s, e('Eletrônicos', 56000, 'p')); s = addTx(s, e('Eletrônicos', 48000, 'n'));
  s = addTx(s, e('Outros', 10000, 'p'));
  return { s, acc };
}

test('grupo perto do limite: 94% e restam R$ 130,05', () => {
  const r = planRows(base().s, K).rows[0];
  assert.equal(r.limit, 210000); assert.equal(r.used, 196995); assert.equal(r.diff, 13005);
  assert.equal(Math.round(r.pct), 94); assert.equal(groupState(r), 'perto');
});
test('grupo estourado: 124% e excedeu R$ 200,00', () => {
  const r = planRows(base().s, K).rows[1];
  assert.equal(r.diff, -20000); assert.equal(Math.round(r.pct), 124); assert.equal(groupState(r), 'excedeu');
});
test('fora dos grupos soma só o pago sem grupo', () => {
  assert.equal(planRows(base().s, K).fora, 10000);
});
test('renda 0 ou grupo 0% não gera NaN nem Infinity', () => {
  const { s } = base(); s.plans[K].renda = 0; s.plans[K].groups.push({ id: 'zz', n: 'Zero', p: 0 });
  for (const r of planRows(s, K).rows) { assert.ok(Number.isFinite(r.pct)); assert.ok(Number.isFinite(r.limit)); }
});
test('mês sem plano devolve null', () => { assert.equal(planRows(base().s, '2027-01'), null); });
test('renda automática = receitas pagas + a receber do mês', () => {
  const { s, acc } = base(); s.plans[K].auto = true;
  let r = addTx(s, { type: 'r', status: 'p', date: '2026-11-05', acc, value: 100000, desc: 's', cat: 'Salário' });
  r = addTx(r, { type: 'r', status: 'n', date: '2026-11-25', acc, value: 50000, desc: 'f', cat: 'Salário' });
  assert.equal(planRows(r, K).renda, 150000);
});
test('soma de % diferente de 100 só informa, não lança', () => {
  const { s } = base(); s.plans[K].groups[0].p = 60;
  assert.equal(planRows(s, K).sum, 110);
});
test('copiar plano leva renda, grupos, % e categorias', () => {
  const r = copyPlan(base().s, K, '2026-12');
  assert.deepEqual(r.plans['2026-12'].groups, r.plans[K].groups);
  assert.deepEqual(r.plans['2026-12'].catGrp, r.plans[K].catGrp);
  r.plans['2026-12'].groups[0].p = 1; assert.equal(r.plans[K].groups[0].p, 50);
});
test('categoria passa a pertencer a outro grupo na hora', () => {
  const r = setCatGroup(base().s, K, 'Outros', 'la');
  assert.equal(planRows(r, K).rows[2].pago, 10000);
});
test('aviso: chave muda quando o grupo estoura e dispensar esconde só aquele estado', () => {
  let { s } = base(); s.prefs.alertThr = 90;
  const ra = alertRows(s, K); assert.equal(ra.length, 2);
  assert.equal(alertKey(ra[0]), 'cv:n'); assert.equal(alertKey(ra[1]), 'pf:o');
  s = dismissAlert(s, 'pf:o');
  assert.deepEqual(alertRows(s, K).map(alertKey), ['cv:n']);
});
test('aviso desligado não devolve nada; limiar 100 ignora grupo perto', () => {
  let { s } = base(); s.prefs.alertThr = 100;
  assert.deepEqual(alertRows(s, K).map(alertKey), ['pf:o']);
  s.prefs.alertOn = false; assert.equal(alertRows(s, K).length, 0);
});
test('guardar sobra: transferência do Livre para a subconta, não é despesa', () => {
  const { s, acc } = base(); const sub = s.accounts[0].subs[0].id;
  const r = saveLeftover(s, K, 'cv', acc, sub, 10000);
  const v = accountView(r, acc);
  assert.equal(v.subs[0].value, 10000);
  assert.equal(v.total, accountView(s, acc).total);
});
test('guardar mais do que resta do grupo lança erro', () => {
  const { s, acc } = base(); const sub = s.accounts[0].subs[0].id;
  assert.throws(() => saveLeftover(s, K, 'cv', acc, sub, 13006), /resta/i);
});
