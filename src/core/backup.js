import { initialState } from '../store/db.js';
import { fmtDate } from './dates.js';

const APP = 'financas-junior', VERSION = 1;

export const makeBackup = (s, nowIso) => ({ app: APP, version: VERSION, savedAt: nowIso, data: s });

export function parseBackup(text) {
  let b;
  try { b = JSON.parse(text); } catch { return { ok: false, error: 'O arquivo está incompleto ou não é um backup.' }; }
  if (!b || b.app !== APP) return { ok: false, error: 'Este arquivo não é um backup deste app.' };
  if (b.version > VERSION) return { ok: false, error: 'Backup de uma versão mais nova do app.' };
  const d = b.data;
  if (!d || !Array.isArray(d.tx) || !Array.isArray(d.accounts)) return { ok: false, error: 'O backup está incompleto.' };
  const iso = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;
  if (!d.tx.every(t => t && typeof t === 'object' && iso(t.date) && Number.isInteger(t.value) && ['e', 'r', 't', 'a'].includes(t.type))) return { ok: false, error: 'O backup tem lançamentos inválidos.' };
  const known = ['inicio', 'lanc', 'contas', 'plano', 'capital', 'metas', 'assin', 'cartoes', 'categ'];
  if (d.bar && !(Array.isArray(d.bar) && d.bar.every(x => known.includes(x)))) return { ok: false, error: 'O backup tem uma barra inválida.' };
  if (d.home && !Array.isArray(d.home)) return { ok: false, error: 'O backup tem um início inválido.' };
  const subcontas = d.accounts.reduce((n, a) => n + (a.subs?.length || 0), 0);
  return { ok: true, savedAt: b.savedAt, data: d, summary: { lancamentos: d.tx.length, subcontas, metas: (d.metas || []).length, assinaturas: (d.assin || []).length } };
}

export function restore(_s, parsed) {
  if (!parsed?.ok) throw new Error('Backup inválido: nada foi alterado.');
  const base = initialState(), d = parsed.data;
  return { ...base, ...d, prefs: { ...base.prefs, ...d.prefs }, meta: { ...base.meta, ...d.meta, lastBackup: parsed.savedAt } };
}

export function markBackup(s, nowIso) { const r = structuredClone(s); r.meta.lastBackup = nowIso; return r; }
export function backupDue(s, nowIso) {
  const last = s.meta.lastBackup;
  return !last || (Date.parse(nowIso) - Date.parse(last)) / 86400000 > 7;
}

const TIPO = { e: 'Despesa', r: 'Receita', t: 'Transferência', a: 'Ajuste' };
const q = v => (/[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
const money = c => (c / 100).toFixed(2).replace('.', ',');
export function toCsv(s) {
  const rows = s.tx.map(t => [fmtDate(t.date), q(t.desc || ''), q(t.cat || ''), TIPO[t.type], (t.type === 'e' ? '-' : '') + money(t.value), t.status === 'p' ? 'Pago' : 'Pendente'].join(';'));
  return ['Data;Descrição;Categoria;Tipo;Valor;Status', ...rows].join('\n');
}

export function eraseAll(confirmText) {
  if (confirmText !== 'APAGAR') throw new Error('Digite APAGAR para confirmar.');
  return initialState();
}
