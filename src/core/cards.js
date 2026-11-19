import { addMonths } from './dates.js';
import { addTx, nextId } from './ledger.js';

const pad = n => String(n).padStart(2, '0');

export function addCard(s, { name, limit = null, closeDay, dueDay, payAcc }) {
  const r = structuredClone(s); r.cards.push({ id: nextId(r), name, limit, closeDay, dueDay, payAcc }); return r;
}
export function editCard(s, id, { name, limit = null, closeDay, dueDay, payAcc }) {
  if (!String(name || '').trim()) throw new Error('Dê um nome para o cartão.');
  if (!(Number.isInteger(closeDay) && closeDay >= 1 && closeDay <= 28 && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 28)) throw new Error('Os dias vão de 1 a 28.');
  const r = structuredClone(s), c = r.cards.find(x => x.id === id); if (!c) throw new Error('Cartão não encontrado.');
  Object.assign(c, { name: name.trim(), limit: limit || null, closeDay, dueDay, payAcc: payAcc ?? null }); return r;
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
  return { total, pago, restante, parcial: pago > 0 && restante > 0, status, closeDate: to, dueDate: dueOf(card, key), items };
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

// Sem "value" paga o que falta; com "value" paga em parte (nunca mais que o restante).
export function payInvoice(s, cardId, key, accId, todayIso, value) {
  const inv = invoiceFor(s, cardId, key, todayIso), v = value ?? inv.restante;
  if (!Number.isInteger(v) || v <= 0) throw new Error('Informe um valor maior que zero.');
  if (v > inv.restante) throw new Error('A fatura tem só ' + (inv.restante / 100).toFixed(2).replace('.', ',') + ' a pagar.');
  return addTx(s, { type: 't', status: 'p', date: todayIso, from: accId, to: null, card: cardId, invoice: key, value: v, desc: 'Pagamento de fatura', cat: 'Cartão' });
}

// Lançamento fixo: repete todo mês por 12 meses; o primeiro segue o status escolhido, os demais ficam pendentes.
export function addRepeat(s, tx, n = 12) {
  const key = tx.date.slice(0, 7), day = tx.date.slice(8), repId = s.meta.nid;
  let r = s;
  for (let i = 0; i < n; i++) {
    const k = addMonths(key, i);
    r = addTx(r, { ...tx, repId, status: i === 0 ? tx.status : 'n', date: `${k}-${pad(Math.min(Number(day), lastDay(k)))}` });
  }
  return r;
}

// Limite usado: tudo que foi comprado no cartão e ainda não foi pago (fatura aberta + parcelas futuras).
export function cardUsed(s, cardId) {
  const bought = s.tx.filter(t => t.card === cardId && t.type === 'e').reduce((n, t) => n + t.value, 0);
  const paid = s.tx.filter(t => t.card === cardId && t.type === 't').reduce((n, t) => n + t.value, 0);
  return Math.max(0, bought - paid);
}

// Parcelas que ainda vão cair depois da fatura de "key", agrupadas por compra ("Descrição i/n").
export function futureInstallments(s, cardId, key) {
  const card = s.cards.find(c => c.id === cardId), after = closeOf(card, key), groups = new Map();
  for (const t of s.tx.filter(x => x.card === cardId && x.type === 'e' && x.date > after).sort((a, b) => a.date.localeCompare(b.date))) {
    const m = /^(.*) (\d+)\/(\d+)$/.exec(t.desc || ''); if (!m) continue;
    const k = m[1] + '|' + m[3], g = groups.get(k) || { desc: m[1], next: Number(m[2]), t: Number(m[3]), count: 0, value: t.value, total: 0, endKey: '' };
    g.count++; g.total += t.value; g.endKey = t.date.slice(0, 7); groups.set(k, g);
  }
  return [...groups.values()];
}
