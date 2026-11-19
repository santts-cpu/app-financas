import { addTx, nextId } from './ledger.js';
import { addMonths } from './dates.js';

const pad = n => String(n).padStart(2, '0');

export function addAssin(s, { name, value, day, from, status = 'ativa' }) {
  if (!(day >= 1 && day <= 28)) throw new Error('O dia da cobrança vai de 1 a 28.');
  const r = structuredClone(s); r.assin.push({ id: nextId(r), name, value, day, from, status }); return r;
}
export function setAssinStatus(s, id, status) {
  const r = structuredClone(s); r.assin.find(a => a.id === id).status = status; return r;
}

export function nextCharges(s, todayIso) {
  const key = todayIso.slice(0, 7), d = Number(todayIso.slice(8, 10));
  return s.assin.filter(a => a.status === 'ativa')
    .map(a => ({ assin: a, date: `${a.day >= d ? key : addMonths(key, 1)}-${pad(a.day)}` }))
    .sort((x, y) => x.date.localeCompare(y.date));
}
export function assinTotal(s) {
  const month = s.assin.filter(a => a.status === 'ativa').reduce((n, a) => n + a.value, 0);
  return { month, year: month * 12 };
}

export function generateMonth(s, key) {
  let r = s;
  for (const a of s.assin.filter(x => x.status === 'ativa')) {
    if ((a.gen || []).includes(key) || r.tx.some(t => t.assinId === a.id && t.date.startsWith(key))) continue;
    const tx = { type: 'e', status: 'n', date: `${key}-${pad(a.day)}`, value: a.value, desc: a.name, cat: 'Assinaturas', assinId: a.id };
    if (a.from.kind === 'card') tx.card = a.from.id; else tx.acc = a.from.id;
    r = addTx(r, tx);
    if (r === s) r = structuredClone(s);
    const ra = r.assin.find(x => x.id === a.id); (ra.gen ||= []).push(key);
  }
  return r;
}

export function useFavorite(s, favId, todayIso) {
  const f = s.favs.find(x => x.id === favId);
  const { id, ...rest } = f;
  return addTx(s, { ...rest, type: f.type || 'e', status: 'p', date: todayIso });
}

export function addFavorite(s, fav) {
  const r = structuredClone(s); r.favs.push({ ...fav, id: r.meta.nid++ }); return r;
}

export function editAssin(s, id, patch) {
  if (patch.day != null && !(patch.day >= 1 && patch.day <= 28)) throw new Error('O dia da cobrança vai de 1 a 28.');
  const r = structuredClone(s); Object.assign(r.assin.find(a => a.id === id), patch); return r;
}
// Excluir não apaga o que já foi lançado: só deixa de gerar os próximos meses.
export function deleteAssin(s, id) { const r = structuredClone(s); r.assin = r.assin.filter(a => a.id !== id); return r; }
// Cria a assinatura; se o dia ainda não passou neste mês, já lança a cobrança pendente do mês.
export function startAssin(s, data, todayIso) {
  let r = addAssin(s, data);
  const a = r.assin.at(-1), key = todayIso.slice(0, 7);
  if (a.day >= Number(todayIso.slice(8, 10))) r = generateOne(r, a.id, key);
  else { r = structuredClone(r); (r.assin.find(x => x.id === a.id).gen ||= []).push(key); }
  return r;
}
function generateOne(s, id, key) {
  const a = s.assin.find(x => x.id === id);
  const tx = { type: 'e', status: 'n', date: `${key}-${pad(a.day)}`, value: a.value, desc: a.name, cat: 'Assinaturas', assinId: a.id };
  if (a.from.kind === 'card') tx.card = a.from.id; else tx.acc = a.from.id;
  const r = addTx(s, tx); (r.assin.find(x => x.id === id).gen ||= []).push(key); return r;
}
export function assinSummary(s, todayIso) {
  const t = assinTotal(s), saved = s.assin.filter(a => a.status === 'cancelada').reduce((n, a) => n + a.value, 0);
  return { ...t, saved, next: nextCharges(s, todayIso).slice(0, 3) };
}
export function sortAssin(list, by = 'dia') {
  const c = { dia: (a, b) => a.day - b.day, valor: (a, b) => b.value - a.value, nome: (a, b) => a.name.localeCompare(b.name, 'pt-BR') }[by] || (() => 0);
  return list.slice().sort((a, b) => c(a, b) || a.id - b.id);
}
// Despesa fixa com categoria Assinaturas vira assinatura (o primeiro lançamento segue o que foi escolhido).
export function repeatAsAssin(s, tx) {
  const day = Math.min(Number(tx.date.slice(8)), 28), key = tx.date.slice(0, 7);
  let r = addAssin(s, { name: tx.desc, value: tx.value, day, from: tx.card != null ? { kind: 'card', id: tx.card } : { kind: 'acc', id: tx.acc } });
  const id = r.assin.at(-1).id; r = addTx(r, { ...tx, assinId: id });
  r = structuredClone(r); (r.assin.find(x => x.id === id).gen ||= []).push(key); return r;
}
// Despesas fixas em cartão (não são assinaturas): lista para "Parar de repetir".
export function fixedRepeats(s, todayIso) {
  const g = new Map();
  for (const t of s.tx) {
    if (t.repId == null || t.type !== 'e' || t.card == null) continue;
    const x = g.get(t.repId) || { repId: t.repId, desc: t.desc, value: t.value, card: t.card, day: Number(t.date.slice(8)), remaining: 0 };
    if (t.status !== 'p' && t.date > todayIso) x.remaining++;
    g.set(t.repId, x);
  }
  return [...g.values()].filter(x => x.remaining > 0);
}
export function stopRepeat(s, repId, todayIso) {
  const r = structuredClone(s); r.tx = r.tx.filter(t => !(t.repId === repId && t.status !== 'p' && t.date > todayIso)); return r;
}
