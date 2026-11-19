// Estado puro: cada função devolve um novo estado. Saldos são sempre derivados.
const clone = s => structuredClone(s);
export const nextId = s => s.meta.nid++;
const acct = (s, id) => { const a = s.accounts.find(x => x.id === id); if (!a) throw new Error('Conta não encontrada'); return a; };

export function addAccount(s, { name, initial = 0 }) {
  const r = clone(s); r.accounts.push({ id: nextId(r), name, initial, subs: [] }); return r;
}
export function addSub(s, accId, { name, value, color }) {
  const r = clone(s); acct(r, accId).subs.push({ id: nextId(r), name, value, ...(color ? { color } : {}) }); return r;
}
export function editSub(s, accId, subId, patch) {
  const r = clone(s), sub = acct(r, accId).subs.find(x => x.id === subId);
  Object.assign(sub, patch); return r;
}
export function setSubValue(s, accId, subId, desired) {
  const shown = accountView(s, accId).subs.find(x => x.id === subId).value;
  const sub = s.accounts.find(a => a.id === accId).subs.find(x => x.id === subId);
  return editSub(s, accId, subId, { value: sub.value + (desired - shown) });
}
// Excluir: o valor volta ao Livre (a subconta some do cálculo) e os lançamentos dela passam para o Livre.
export function delSub(s, accId, subId) {
  const r = clone(s), a = acct(r, accId); a.subs = a.subs.filter(x => x.id !== subId);
  for (const t of r.tx) { if (t.acc === accId && t.sub === subId) delete t.sub; if (t.from === accId && t.fromSub === subId) delete t.fromSub; if (t.to === accId && t.toSub === subId) delete t.toSub; }
  return r;
}
export function moveAccount(s, accId, dir) {
  const r = clone(s), i = r.accounts.findIndex(x => x.id === accId), j = i + dir;
  if (i < 0 || j < 0 || j >= r.accounts.length) return r;
  [r.accounts[i], r.accounts[j]] = [r.accounts[j], r.accounts[i]]; return r;
}
// Extrato de uma conta num mês. sub: undefined = todas, 'livre' = sem subconta, id = só aquela subconta.
export function accountStatement(s, accId, key, sub) {
  const mine = t => (t.type === 't' ? [[t.from, t.fromSub], [t.to, t.toSub]].filter(([a]) => a === accId).map(x => x[1]) : t.acc === accId ? [t.sub] : []);
  return s.tx.filter(t => t.date.startsWith(key) && mine(t).length && (sub == null || mine(t).some(x => (sub === 'livre' ? x == null : x === sub))))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

// Efeito de um lançamento pago. Despesa subtrai, receita soma, ajuste ('a') soma o valor com sinal.
// Transferência ('t') sai de `from` (e `fromSub`) e entra em `to` (e `toSub`).
const sign = t => (t.type === 'r' || t.type === 'a' ? t.value : -t.value);
function effect(t, accId, subId) {
  if (t.status !== 'p') return 0;
  if (t.type === 't') {
    const out = t.from === accId && (subId == null || t.fromSub === subId) ? -t.value : 0;
    const inn = t.to === accId && (subId == null || t.toSub === subId) ? t.value : 0;
    return out + inn;
  }
  return t.acc === accId && (subId == null || t.sub === subId) ? sign(t) : 0;
}

export function accountView(s, accId) {
  const a = acct(s, accId);
  const total = a.initial + s.tx.reduce((n, t) => n + effect(t, accId), 0);
  const subs = a.subs.map(sub => ({ id: sub.id, name: sub.name, value: sub.value + s.tx.reduce((n, t) => n + effect(t, accId, sub.id), 0) }));
  return { total, livre: total - subs.reduce((n, x) => n + x.value, 0), subs };
}

export function transferBetweenSubs(s, accId, from, to, cents, date = new Date().toISOString().slice(0, 10)) {
  const v = accountView(s, accId);
  if (from !== 'livre' && v.subs.find(x => x.id === from).value < cents) throw new Error('Valor maior que o da subconta');
  const r = clone(s), a = acct(r, accId), nm = x => (x === 'livre' ? 'Livre' : a.subs.find(y => y.id === x).name);
  (a.moves ||= []).push({ id: nextId(r), from, to, value: cents, date, fromName: nm(from), toName: nm(to) });
  if (from !== 'livre') a.subs.find(x => x.id === from).value -= cents;
  if (to !== 'livre') a.subs.find(x => x.id === to).value += cents;
  return r;
}

export function adjustBalance(s, accId, realCents) {
  const diff = realCents - accountView(s, accId).total, r = clone(s);
  r.tx.push({ id: nextId(r), type: 'a', value: diff, status: 'p', acc: accId, desc: 'Ajuste de saldo', cat: 'Ajuste de saldo', date: new Date().toISOString().slice(0, 10) });
  return r;
}

const today = () => new Date().toISOString().slice(0, 10);
export function addTx(s, tx) {
  if (!(tx.value > 0) && tx.type !== 'a') throw new Error('Informe um valor maior que zero.');
  const r = clone(s); r.tx.push({ date: today(), status: 'p', ...tx, id: nextId(r) }); return r;
}
export function effectTx(s, id) { const r = clone(s); r.tx.find(t => t.id === id).status = 'p'; return r; }
export function editTx(s, id, patch) { const r = clone(s); Object.assign(r.tx.find(t => t.id === id), patch); return r; }
export function delTx(s, id) { const r = clone(s); r.tx = r.tx.filter(t => t.id !== id); return r; }

export function monthSummary(s, key) {
  const m = { receitas: 0, despesas: 0, aReceber: 0, aPagar: 0, pendentes: 0 };
  for (const t of s.tx) {
    if (!t.date.startsWith(key) || (t.type !== 'e' && t.type !== 'r')) continue;
    if (t.status === 'p') m[t.type === 'r' ? 'receitas' : 'despesas'] += t.value;
    else { m[t.type === 'r' ? 'aReceber' : 'aPagar'] += t.value; m.pendentes++; }
  }
  return { receitas: m.receitas, despesas: m.despesas, resultado: m.receitas - m.despesas, aReceber: m.aReceber, aPagar: m.aPagar, pendentes: m.pendentes };
}
