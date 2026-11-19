import { accountView, addTx, addSub, nextId } from './ledger.js';

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
  let perMonth, late = false;
  if (g.deadline && saved < g.target) {
    late = g.deadline <= todayIso.slice(0, 7);
    const [ty, tm] = todayIso.slice(0, 7).split('-').map(Number), [dy, dm] = g.deadline.split('-').map(Number);
    perMonth = Math.ceil((g.target - saved) / Math.max(1, (dy * 12 + dm) - (ty * 12 + tm)));
  }
  return { saved, pct, perMonth, late };
}

export function contribute(s, goalId, cents, fromAcc, todayIso) {
  const g = s.metas.find(x => x.id === goalId), d = g.dest;
  if (cents > accountView(s, fromAcc).livre) throw new Error('O Livre da conta não cobre esse valor.');
  const tx = { type: 't', status: 'p', date: todayIso, value: cents, desc: 'Guardado na meta ' + g.name, cat: 'Transferência', from: fromAcc, metaId: goalId };
  if (d.kind === 'acc') tx.to = d.id; else { tx.to = d.acc; if (d.kind === 'sub') tx.toSub = d.id; }
  return addTx(s, tx);
}

export function completeGoal(s, id) { const r = structuredClone(s); r.metas.find(g => g.id === id).done = true; return r; }
export function reopenGoal(s, id) { const r = structuredClone(s); r.metas.find(g => g.id === id).done = false; return r; }
export function editGoal(s, id, patch) {
  const g = s.metas.find(x => x.id === id), next = { ...g, ...patch };
  if (patch.dest && s.metas.some(x => x.id !== id && !x.done && same(x.dest, patch.dest))) throw new Error('Já existe uma meta para o mesmo destino.');
  const r = structuredClone(s); Object.assign(r.metas.find(x => x.id === id), next); return r;
}
// Excluir a meta não apaga o porquinho nem os aportes (os lançamentos ficam).
export function deleteGoal(s, id) { const r = structuredClone(s); r.metas = r.metas.filter(g => g.id !== id); return r; }
export function moveGoal(s, id, dir) {
  const r = structuredClone(s), i = r.metas.findIndex(g => g.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= r.metas.length) return r;
  [r.metas[i], r.metas[j]] = [r.metas[j], r.metas[i]]; return r;
}
// Histórico: aportes registrados e o "saldo de antes" (o que já estava guardado sem aporte).
export function goalHistory(s, g) {
  const items = s.tx.filter(t => t.metaId === g.id).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const saved = savedOf(s, g.dest);
  return { items, before: saved === null ? 0 : saved - items.reduce((n, t) => n + t.value, 0) };
}
// Totais só das metas ativas: quanto está guardado e quanto guardar por mês para cumprir os prazos.
export function goalsTotals(s, todayIso) {
  let saved = 0, perMonth = 0;
  for (const g of s.metas.filter(x => !x.done)) { const i = goalInfo(s, g, todayIso); saved += i.saved; perMonth += i.perMonth || 0; }
  return { saved, perMonth };
}
// Cria um porquinho novo com o nome da meta e liga a meta a ele.
export function addGoalNewSub(s, accId, { name, target, deadline = null, color }) {
  const withSub = addSub(s, accId, { name, value: 0, color }), sub = withSub.accounts.find(a => a.id === accId).subs.at(-1);
  return addGoal(withSub, { name, target, dest: { kind: 'sub', acc: accId, id: sub.id }, deadline, color });
}
