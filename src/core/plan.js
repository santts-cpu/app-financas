import { monthSummary, addTx, accountView } from './ledger.js';

export function planRows(s, key) {
  const p = s.plans[key];
  if (!p) return null;
  const m = monthSummary(s, key);
  const renda = p.auto ? m.receitas + m.aReceber : p.renda;
  const grpOf = cat => p.catGrp[cat];
  const sums = {}; let pagoTotal = 0;
  for (const t of s.tx) {
    if (t.type !== 'e' || !t.date.startsWith(key)) continue;
    const g = grpOf(t.cat);
    if (t.status === 'p') pagoTotal += t.value;
    if (!g) continue;
    sums[g] ??= { pago: 0, prev: 0 };
    sums[g][t.status === 'p' ? 'pago' : 'prev'] += t.value;
  }
  let pagoGrupos = 0;
  const rows = p.groups.map(group => {
    const { pago = 0, prev = 0 } = sums[group.id] || {};
    const limit = Math.round(renda * group.p / 100), used = pago + prev;
    pagoGrupos += pago;
    return { group, limit, pago, prev, used, diff: limit - used, pct: limit > 0 ? used / limit * 100 : used > 0 ? 999 : 0 };
  });
  return { renda, rows, fora: pagoTotal - pagoGrupos, sum: p.groups.reduce((n, g) => n + g.p, 0) };
}

export const groupState = r => (r.pct > 100 ? 'excedeu' : r.pct >= 90 ? 'perto' : 'ok');

export function copyPlan(s, from, to) {
  const r = structuredClone(s); r.plans[to] = structuredClone(r.plans[from]); return r;
}
export function setCatGroup(s, key, cat, groupId) {
  const r = structuredClone(s);
  if (groupId) r.plans[key].catGrp[cat] = groupId; else delete r.plans[key].catGrp[cat];
  return r;
}

export const alertKey = r => r.group.id + ':' + (r.pct > 100 ? 'o' : 'n');
export function alertRows(s, key) {
  if (!s.prefs.alertOn) return [];
  const pr = planRows(s, key);
  if (!pr) return [];
  return pr.rows.filter(r => (r.pct > 100 || (s.prefs.alertThr === 90 && r.pct >= 90)) && !s.prefs.alertHide.includes(alertKey(r)));
}
export function dismissAlert(s, k) {
  const r = structuredClone(s); if (!r.prefs.alertHide.includes(k)) r.prefs.alertHide.push(k); return r;
}

// Quanto ainda dá para guardar da sobra do grupo: o que resta do planejado menos o que já foi guardado.
export function leftoverRoom(s, key, groupId) {
  const row = planRows(s, key)?.rows.find(r => r.group.id === groupId);
  if (!row) return 0;
  const saved = s.tx.filter(t => t.plGrp === groupId && t.plKey === key).reduce((n, t) => n + t.value, 0);
  return Math.max(0, row.diff - saved);
}

// Transferência do Livre de accId para uma subconta (ou para outra conta, com toAcc). Não é despesa.
export function saveLeftover(s, key, groupId, accId, subId, cents, toAcc = accId) {
  if (!(cents > 0)) throw new Error('Informe um valor maior que zero.');
  if (cents > leftoverRoom(s, key, groupId)) throw new Error('Só resta o que sobrou do planejado do grupo.');
  if (cents > accountView(s, accId).livre) throw new Error('O Livre da conta não cobre esse valor.');
  return addTx(s, { type: 't', status: 'p', from: accId, to: toAcc, ...(subId != null ? { toSub: subId } : {}), value: cents, desc: 'Sobra do plano', cat: 'Transferência', plGrp: groupId, plKey: key });
}
