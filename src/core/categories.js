import { nextId } from './ledger.js';
const clone = s => structuredClone(s);
const has = (s, name) => s.cats.some(c => c.name === name);

export function addCat(s, { name, type, color, subs = [] }) {
  if (has(s, name)) throw new Error('Já existe uma categoria com esse nome.');
  const r = clone(s); r.cats.push({ id: nextId(r), name, type, color, subs, arch: false }); return r;
}
export const listEditable = (s, type) => s.cats.filter(c => c.type === type && !c.system);
export const listOptions = (s, type) => listEditable(s, type).filter(c => !c.arch);

function remap(r, from, to, keepDest = false) {
  r.tx.forEach(t => { if (t.cat === from) t.cat = to; });
  r.favs.forEach(f => { if (f.cat === from) f.cat = to; });
  Object.values(r.plans).forEach(p => { if (from in p.catGrp) { if (to && !(keepDest && to in p.catGrp)) p.catGrp[to] = p.catGrp[from]; delete p.catGrp[from]; } });
}

export function renameCat(s, from, to) {
  if (has(s, to)) throw new Error('Já existe uma categoria com esse nome.');
  const r = clone(s); r.cats.find(c => c.name === from).name = to; remap(r, from, to); return r;
}
export function editCat(s, name, { color, subs }) {
  const r = clone(s), c = r.cats.find(x => x.name === name);
  if (color) c.color = color;
  if (subs) { const seen = new Set(); c.subs = subs.map(x => x.trim()).filter(x => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())); }
  return r;
}
export function unarchiveCat(s, name) { const r = clone(s); r.cats.find(c => c.name === name).arch = false; return r; }
export function archiveCat(s, name) { const r = clone(s); r.cats.find(c => c.name === name).arch = true; return r; }

export function deleteCat(s, name, destName) {
  const inUse = s.tx.some(t => t.cat === name) || s.favs.some(f => f.cat === name);
  if (inUse && !destName) throw new Error('Escolha uma categoria de destino para os lançamentos.');
  const r = clone(s);
  if (inUse) remap(r, name, destName, true);
  else Object.values(r.plans).forEach(p => delete p.catGrp[name]);
  r.cats = r.cats.filter(c => c.name !== name);
  return r;
}

export const catMonthSpend = (s, name, key) =>
  s.tx.filter(t => t.cat === name && t.type === 'e' && t.status === 'p' && t.date.startsWith(key)).reduce((n, t) => n + t.value, 0);
