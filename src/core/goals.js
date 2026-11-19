import { accountView, addTx, nextId } from './ledger.js';

const same = (a, b) => a.kind === b.kind && a.id === b.id && a.acc === b.acc;

export function addGoal(s, { name, target, dest, deadline = null, color }) {
  if (s.metas.some(g => !g.done && same(g.dest, dest))) throw new Error('Já existe uma meta para o mesmo destino.');
  const r = structuredClone(s); r.metas.push({ id: nextId(r), name, target, dest, deadline, color, done: false }); return r;
}

function savedOf(s, d) {
  try {
    if (d.kind === 'acc') return accountView(s, d.id).total;
    const v = accountView(s, d.acc);
    if (d.kind === 'livre') return v.livre;
    const sub = v.subs.find(x => x.id === d.id);
    return sub ? sub.value : null;
  } catch { return null; }
}

export function goalInfo(s, g, todayIso) {
  const saved = savedOf(s, g.dest);
  if (saved === null) return { removed: true, saved: 0, pct: 0 };
  const pct = g.target > 0 ? Math.min(100, saved / g.target * 100) : 0;
  let perMonth;
  if (g.deadline && saved < g.target) {
    const [ty, tm] = todayIso.slice(0, 7).split('-').map(Number), [dy, dm] = g.deadline.split('-').map(Number);
    perMonth = Math.ceil((g.target - saved) / Math.max(1, (dy * 12 + dm) - (ty * 12 + tm)));
  }
  return { saved, pct, perMonth };
}

export function contribute(s, goalId, cents, fromAcc, todayIso) {
  const g = s.metas.find(x => x.id === goalId), d = g.dest;
  if (cents > accountView(s, fromAcc).livre) throw new Error('O Livre da conta não cobre esse valor.');
  const tx = { type: 't', status: 'p', date: todayIso, value: cents, desc: 'Guardado na meta ' + g.name, cat: 'Transferência', from: fromAcc };
  if (d.kind === 'acc') tx.to = d.id; else { tx.to = d.acc; if (d.kind === 'sub') tx.toSub = d.id; }
  return addTx(s, tx);
}

export function completeGoal(s, id) { const r = structuredClone(s); r.metas.find(g => g.id === id).done = true; return r; }
