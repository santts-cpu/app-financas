import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney } from '../../src/core/money.js';
import { initialState } from '../../src/store/db.js';
import { addAccount, addSub, addTx, accountView, setSubValue } from '../../src/core/ledger.js';
import { addCard, addInstallments, invoiceFor, payInvoice } from '../../src/core/cards.js';
import { addCat, deleteCat } from '../../src/core/categories.js';
import { addAssin, generateMonth } from '../../src/core/subs.js';
import { parseBackup, makeBackup } from '../../src/core/backup.js';

test('parseMoney: ponto de milhar pt-BR e casas demais', () => {
  assert.equal(parseMoney('1.500'), 150000);
  assert.equal(parseMoney('12.345'), 1234500);
  assert.equal(parseMoney('1.234.567'), 123456700);
  assert.equal(parseMoney('1.234,56'), 123456);
  assert.equal(parseMoney('1.5'), 150);
  assert.equal(parseMoney('42.90'), 4290);
  assert.equal(parseMoney('1,005'), null);
  assert.equal(parseMoney('99999999999999999'), null);
});
test('editar subconta com lançamentos: o valor mostrado vira o valor gravado', () => {
  let s = addAccount(initialState(), { name: 'N', initial: 100000 }); const a = s.accounts[0].id;
  s = addSub(s, a, { name: 'Viagem', value: 0 }); const sub = s.accounts[0].subs[0].id;
  s = addTx(s, { type: 'r', status: 'p', date: '2026-11-01', acc: a, sub, value: 50000, desc: 'x', cat: 'x' });
  assert.equal(accountView(s, a).subs[0].value, 50000);
  s = setSubValue(s, a, sub, 50000);
  assert.equal(accountView(s, a).subs[0].value, 50000); assert.equal(accountView(s, a).livre, 100000);
  s = setSubValue(s, a, sub, 70000);
  assert.equal(accountView(s, a).subs[0].value, 70000);
});
test('excluir categoria não muda o grupo da categoria destino', () => {
  let s = initialState(); for (const n of ['Lanche', 'Mercado']) s = addCat(s, { name: n, type: 'e', color: '#000' });
  s.plans['2026-11'] = { auto: false, renda: 1, groups: [{ id: 'g1', n: 'Lazer', p: 50 }, { id: 'g2', n: 'Essencial', p: 50 }], catGrp: { Lanche: 'g1', Mercado: 'g2' } };
  s = addAccount(s, { name: 'N', initial: 0 });
  s = addTx(s, { type: 'e', status: 'p', date: '2026-11-02', acc: s.accounts[0].id, value: 100, desc: 'a', cat: 'Lanche' });
  s = deleteCat(s, 'Lanche', 'Mercado');
  assert.deepEqual(s.plans['2026-11'].catGrp, { Mercado: 'g2' });
});
test('parcelas: só inteiros de 1 a 48 e dia 31 vira último dia do mês', () => {
  let s = addAccount(initialState(), { name: 'N', initial: 0 }); s = addCard(s, { name: 'C', limit: 1e6, closeDay: 2, dueDay: 9, payAcc: s.accounts[0].id });
  const tx = { type: 'e', status: 'p', date: '2026-01-31', value: 1000, desc: 'TV', cat: 'x', card: s.cards[0].id };
  assert.throws(() => addInstallments(s, tx, 2.5), /parcelas/i);
  assert.throws(() => addInstallments(s, tx, 0), /parcelas/i);
  assert.throws(() => addInstallments(s, { ...tx, value: 1 }, 3), /parcelas/i);
  const r = addInstallments(s, tx, 3);
  assert.deepEqual(r.tx.map(t => t.date), ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.equal(r.tx.reduce((n, t) => n + t.value, 0), 1000);
});
test('fatura paga com compra lançada depois volta a ter saldo a pagar', () => {
  let s = addAccount(initialState(), { name: 'N', initial: 100000 }); const acc = s.accounts[0].id;
  s = addCard(s, { name: 'C', limit: 1e6, closeDay: 2, dueDay: 9, payAcc: acc }); const card = s.cards[0].id;
  s = addTx(s, { type: 'e', status: 'p', date: '2026-11-10', value: 1000, desc: 'a', cat: 'x', card });
  s = payInvoice(s, card, '2026-12', acc, '2026-12-03');
  assert.equal(invoiceFor(s, card, '2026-12', '2026-12-03').status, 'paga');
  s = addTx(s, { type: 'e', status: 'p', date: '2026-11-12', value: 700, desc: 'b', cat: 'x', card });
  const inv = invoiceFor(s, card, '2026-12', '2026-12-03');
  assert.notEqual(inv.status, 'paga'); assert.equal(inv.restante, 700);
  s = payInvoice(s, card, '2026-12', acc, '2026-12-04');
  assert.equal(s.tx.at(-1).value, 700); assert.equal(invoiceFor(s, card, '2026-12', '2026-12-04').status, 'paga');
});
test('cobrança de assinatura apagada não volta', () => {
  let s = addAccount(initialState(), { name: 'N', initial: 0 });
  s = addAssin(s, { name: 'H', value: 100, day: 20, from: { kind: 'acc', id: s.accounts[0].id } });
  s = generateMonth(s, '2026-11'); assert.equal(s.tx.length, 1);
  s = { ...s, tx: [] };
  s = generateMonth(s, '2026-11'); assert.equal(s.tx.length, 0);
  s = generateMonth(s, '2026-12'); assert.equal(s.tx.length, 1);
});
test('backup mal formado é recusado', () => {
  const ok = initialState(); const wrap = d => JSON.stringify(makeBackup(d, '2026-11-18T00:00:00Z'));
  assert.equal(parseBackup(wrap(ok)).ok, true);
  assert.equal(parseBackup(wrap({ ...ok, tx: [{}] })).ok, false);
  assert.equal(parseBackup(wrap({ ...ok, tx: [{ type: 'e', date: '2026-02-31', value: 1 }] })).ok, false);
  assert.equal(parseBackup(wrap({ ...ok, tx: [{ type: 'e', date: '2026-02-03', value: 1.5 }] })).ok, false);
  assert.equal(parseBackup(wrap({ ...ok, bar: ['inicio', 'zzz'] })).ok, false);
});
