import { addMonths } from './dates.js';
import { addTx, nextId } from './ledger.js';

const pad = n => String(n).padStart(2, '0');

export function addCard(s, { name, limit = null, closeDay, dueDay, payAcc }) {
  const r = structuredClone(s); r.cards.push({ id: nextId(r), name, limit, closeDay, dueDay, payAcc }); return r;
}
export const bestPurchaseDay = card => card.closeDay + 1;

const closeOf = (card, key) => `${key}-${pad(card.closeDay)}`;
const dueOf = (card, key) => `${card.dueDay > card.closeDay ? key : addMonths(key, 1)}-${pad(card.dueDay)}`;

export function invoiceFor(s, cardId, key, todayIso) {
  const card = s.cards.find(c => c.id === cardId);
  const from = closeOf(card, addMonths(key, -1)), to = closeOf(card, key);
  const items = s.tx.filter(t => t.card === cardId && t.type === 'e' && t.date > from && t.date <= to);
  const total = items.reduce((n, t) => n + t.value, 0);
  const pago = s.tx.filter(t => t.card === cardId && t.invoice === key).reduce((n, t) => n + t.value, 0);
  const restante = Math.max(0, total - pago);
  const status = pago > 0 && restante === 0 ? 'paga' : todayIso > to ? 'fechada' : 'aberta';
  return { total, pago, restante, status, closeDate: to, dueDate: dueOf(card, key), items };
}

const lastDay = key => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
export function addInstallments(s, tx, n) {
  if (!Number.isInteger(n) || n < 1 || n > 48) throw new Error('Parcelas: informe um número inteiro de 1 a 48.');
  if (tx.value < n) throw new Error('Parcelas: o valor é pequeno demais para tantas parcelas.');
  const base = Math.floor(tx.value / n), rest = tx.value - base * n, key = tx.date.slice(0, 7), day = tx.date.slice(8);
  let r = s;
  for (let i = 0; i < n; i++) {
    r = addTx(r, { ...tx, value: base + (i === 0 ? rest : 0), date: `${addMonths(key, i)}-${pad(Math.min(Number(day), lastDay(addMonths(key, i))))}`, desc: `${tx.desc} ${i + 1}/${n}` });
  }
  return r;
}

export function payInvoice(s, cardId, key, accId, todayIso) {
  const inv = invoiceFor(s, cardId, key, todayIso);
  return addTx(s, { type: 't', status: 'p', date: todayIso, from: accId, to: null, card: cardId, invoice: key, value: inv.restante, desc: 'Pagamento de fatura', cat: 'Cartão' });
}

// Lançamento fixo: repete todo mês por 12 meses; o primeiro segue o status escolhido, os demais ficam pendentes.
export function addRepeat(s, tx, n = 12) {
  const key = tx.date.slice(0, 7), day = tx.date.slice(8);
  let r = s;
  for (let i = 0; i < n; i++) {
    const k = addMonths(key, i);
    r = addTx(r, { ...tx, status: i === 0 ? tx.status : 'n', date: `${k}-${pad(Math.min(Number(day), lastDay(k)))}` });
  }
  return r;
}
