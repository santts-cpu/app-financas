import { accountView, nextId } from './ledger.js';

const clone = s => structuredClone(s);
function ensureClass(r, cls) {
  if (!r.cap.classes.some(c => c.n === cls)) r.cap.classes.push({ n: cls, meta: 0, fora: false });
}

export function addAsset(s, { name, cls, loc, value }) {
  const r = clone(s); ensureClass(r, cls);
  r.cap.items.push({ id: nextId(r), n: name, cls, loc, v: value }); return r;
}
export function linkAccount(s, ref, cls = 'Reserva') {
  const r = clone(s); ensureClass(r, cls);
  r.cap.items.push({ id: nextId(r), cls, link: ref }); return r;
}

function resolveLink(s, link) {
  const a = s.accounts.find(x => x.id === (link.kind === 'acc' ? link.id : link.acc));
  if (!a) return null;
  const v = accountView(s, a.id);
  if (link.kind === 'acc') return { name: a.name, loc: a.name, value: v.total };
  if (link.kind === 'livre') return { name: `Livre ${a.name}`, loc: a.name, value: v.livre };
  const sub = v.subs.find(x => x.id === link.id);
  return sub ? { name: sub.name, loc: a.name, value: sub.value } : null;
}

export function capItems(s) {
  const out = [];
  for (const i of s.cap.items) {
    if (!i.link) { out.push({ id: i.id, name: i.n, cls: i.cls, loc: i.loc, value: i.v, linked: false }); continue; }
    const r = resolveLink(s, i.link);
    if (r) out.push({ id: i.id, name: r.name, cls: i.cls, loc: r.loc, value: r.value, linked: true });
  }
  return out;
}

const isFora = (s, cls) => s.cap.classes.find(c => c.n === cls)?.fora === true;

export function capTotals(s) {
  const items = capItems(s);
  const investimentos = items.filter(i => !isFora(s, i.cls)).reduce((n, i) => n + i.value, 0);
  const reserva = items.filter(i => isFora(s, i.cls)).reduce((n, i) => n + i.value, 0);
  return { investimentos, reserva, total: investimentos + reserva };
}

export function capByClass(s) {
  const items = capItems(s), base = capTotals(s).investimentos;
  return s.cap.classes.map(c => {
    const value = items.filter(i => i.cls === c.n).reduce((n, i) => n + i.value, 0);
    if (c.fora) return { cls: c.n, value, pct: null, meta: c.meta, fora: true, desvioPts: null, desvioCents: null };
    const pct = base > 0 ? value / base * 100 : 0;
    return { cls: c.n, value, pct, meta: c.meta, fora: false, desvioPts: pct - c.meta, desvioCents: value - Math.round(base * c.meta / 100) };
  });
}

export function capByLoc(s) {
  const items = capItems(s), total = capTotals(s).total, by = new Map();
  for (const i of items) { if (!by.has(i.loc)) by.set(i.loc, []); by.get(i.loc).push(i); }
  return [...by].map(([loc, its]) => {
    const value = its.reduce((n, i) => n + i.value, 0);
    return { loc, value, pct: total > 0 ? value / total * 100 : 0, items: its };
  });
}

export function setClassMetas(s, map) {
  const r = clone(s);
  for (const c of r.cap.classes) if (!c.fora && c.n in map) c.meta = map[c.n];
  const sum = r.cap.classes.filter(c => !c.fora).reduce((n, c) => n + c.meta, 0);
  if (sum !== 100) throw new Error(`As metas precisam somar 100% (hoje somam ${sum}%).`);
  return r;
}

// Tipos prontos: preenchem nome e classe ao adicionar um ativo digitado.
export const ASSET_TYPES = [['Tesouro Selic', 'Renda fixa'], ['Tesouro IPCA+', 'Renda fixa'], ['CDB', 'Renda fixa'], ['LCI/LCA', 'Renda fixa'], ['Fundo', 'Fundos'], ['FIIs', 'FIIs'], ['Ações', 'Ações'], ['ETF', 'Ações'], ['Cripto', 'Cripto'], ['Previdência', 'Previdência'], ['Outro', 'Outros']];

export function editAsset(s, id, { name, cls, loc, value }) {
  const r = clone(s), i = r.cap.items.find(x => x.id === id);
  if (!i || i.link) throw new Error('Este item acompanha uma conta: só a classe pode mudar.');
  if (cls) ensureClass(r, cls);
  Object.assign(i, { ...(name ? { n: name } : {}), ...(cls ? { cls } : {}), ...(loc ? { loc } : {}), ...(value != null ? { v: value } : {}) });
  return r;
}
export function setItemClass(s, id, cls) {
  const r = clone(s); ensureClass(r, cls); r.cap.items.find(x => x.id === id).cls = cls; return r;
}
export function removeAsset(s, id) { const r = clone(s); r.cap.items = r.cap.items.filter(i => i.id !== id); return r; }
