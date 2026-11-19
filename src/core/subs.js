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
