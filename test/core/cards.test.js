import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../../src/store/db.js';
import { addAccount, accountView, addTx, monthSummary } from '../../src/core/ledger.js';
import { addCard, invoiceFor, bestPurchaseDay, addInstallments, payInvoice } from '../../src/core/cards.js';

function base() {
  let s = initialState();
  s = addAccount(s, { name: 'Nubank', initial: 500000 });
  const acc = s.accounts[0].id;
  s = addCard(s, { name: 'Nubank', limit: 300000, closeDay: 2, dueDay: 9, payAcc: acc });
  return { s, acc, card: s.cards[0].id };
}
const buy = (card, date, value) => ({ type: 'e', status: 'p', card, date, value, desc: 'Compra', cat: 'Alimentação' });

test('compra até o dia de fechamento entra na fatura do mês, depois vai para a seguinte', () => {
  const { s, card } = base();
  let r = addTx(s, buy(card, '2026-11-02', 10000));
  r = addTx(r, buy(card, '2026-11-03', 5000));
  assert.equal(invoiceFor(r, card, '2026-11', '2026-11-18').total, 10000);
  assert.equal(invoiceFor(r, card, '2026-12', '2026-11-18').total, 5000);
});
test('status: aberta antes do fechamento, fechada depois, paga após pagamento', () => {
  const { s, acc, card } = base();
  let r = addTx(s, buy(card, '2026-10-20', 10000));
  assert.equal(invoiceFor(r, card, '2026-11', '2026-11-01').status, 'aberta');
  assert.equal(invoiceFor(r, card, '2026-11', '2026-11-05').status, 'fechada');
  r = payInvoice(r, card, '2026-11', acc, '2026-11-09');
  assert.equal(invoiceFor(r, card, '2026-11', '2026-11-10').status, 'paga');
});
test('compra no cartão não mexe no saldo da conta; pagar a fatura sim, sem virar despesa', () => {
  const { s, acc, card } = base();
  let r = addTx(s, buy(card, '2026-10-20', 10000));
  assert.equal(accountView(r, acc).total, 500000);
  const antes = monthSummary(r, '2026-11').despesas;
  r = payInvoice(r, card, '2026-11', acc, '2026-11-09');
  assert.equal(accountView(r, acc).total, 490000);
  assert.equal(monthSummary(r, '2026-11').despesas, antes);
});
test('melhor dia de compra é o dia seguinte ao fechamento', () => {
  assert.equal(bestPurchaseDay({ closeDay: 2 }), 3);
});
test('parcelas: 3x gera 3 lançamentos em meses seguintes e a soma fecha', () => {
  const { s, card } = base();
  const r = addInstallments(s, buy(card, '2026-11-10', 10000), 3);
  assert.deepEqual(r.tx.map(t => t.date), ['2026-11-10', '2026-12-10', '2027-01-10']);
  assert.deepEqual(r.tx.map(t => t.desc), ['Compra 1/3', 'Compra 2/3', 'Compra 3/3']);
  assert.equal(r.tx.reduce((n, t) => n + t.value, 0), 10000);
});
