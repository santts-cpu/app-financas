import { initialState } from '../store/db.js';
import { fmtDate } from './dates.js';

const APP = 'financas-junior', VERSION = 1;

// O arquivo de backup nunca leva a senha do aparelho.
export const makeBackup = (s, nowIso) => ({ app: APP, version: VERSION, savedAt: nowIso, data: { ...s, prefs: { ...s.prefs, pin: null, lock: null } } });

const MAX_FILE = 30 * 1024 * 1024, MAX_STR = 2000, MAX_NODES = 2_000_000, BAD_KEYS = ['__proto__', 'constructor', 'prototype'];
// Confere o arquivo inteiro: sem chaves perigosas, textos de tamanho razoável, profundidade limitada.
function deepOk(v) {
  let nodes = 0;
  const walk = (x, depth) => {
    if (++nodes > MAX_NODES || depth > 12) return false;
    if (typeof x === 'string') return x.length <= MAX_STR;
    if (x === null || typeof x !== 'object') return typeof x === 'number' ? Number.isFinite(x) : true;
    if (Array.isArray(x)) return x.every(i => walk(i, depth + 1));
    return Object.keys(x).every(k => !BAD_KEYS.includes(k) && walk(x[k], depth + 1));
  };
  return walk(v, 0);
}

export function parseBackup(text) {
  let b;
  if (typeof text !== 'string' || text.length > MAX_FILE) return { ok: false, error: 'O arquivo é grande demais para ser um backup deste app.' };
  if (/"(__proto__|constructor|prototype)"\s*:/.test(text)) return { ok: false, error: 'O backup tem conteúdo inválido.' };
  try { b = JSON.parse(text); } catch { return { ok: false, error: 'O arquivo está incompleto ou não é um backup.' }; }
  if (!b || b.app !== APP) return { ok: false, error: 'Este arquivo não é um backup deste app.' };
  if (b.version > VERSION) return { ok: false, error: 'Backup de uma versão mais nova do app.' };
  const d = b.data;
  if (!d || !Array.isArray(d.tx) || !Array.isArray(d.accounts)) return { ok: false, error: 'O backup está incompleto.' };
  if (!deepOk(d)) return { ok: false, error: 'O backup tem textos ou dados fora do normal.' };
  const isId = x => Number.isInteger(x) && x >= 0, optNum = x => x == null || Number.isFinite(x), optStr = x => x == null || typeof x === 'string';
  if (!d.accounts.every(a => a && isId(a.id) && typeof a.name === 'string' && (a.subs == null || (Array.isArray(a.subs) && a.subs.every(x => x && isId(x.id) && typeof x.name === 'string'))))) return { ok: false, error: 'O backup tem contas inválidas.' };
  for (const k of ['cards', 'cats', 'metas', 'assin', 'favs']) if (d[k] != null && !Array.isArray(d[k])) return { ok: false, error: 'O backup está incompleto.' };
  if (d.prefs != null && (typeof d.prefs !== 'object' || Array.isArray(d.prefs))) return { ok: false, error: 'O backup tem ajustes inválidos.' };
  const iso = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;
  if (!d.tx.every(t => t && typeof t === 'object' && iso(t.date) && Number.isInteger(t.value) && ['e', 'r', 't', 'a'].includes(t.type) && isId(t.id) && (t.status == null || ['p', 'n'].includes(t.status)) && optStr(t.desc) && optStr(t.cat) && optStr(t.note) && optNum(t.acc) && optNum(t.card) && optNum(t.from) && optNum(t.to))) return { ok: false, error: 'O backup tem lançamentos inválidos.' };
  const known = ['inicio', 'lanc', 'contas', 'plano', 'capital', 'metas', 'assin', 'cartoes', 'categ'];
  if (d.bar && !(Array.isArray(d.bar) && d.bar.every(x => known.includes(x)))) return { ok: false, error: 'O backup tem uma barra inválida.' };
  if (d.home && !Array.isArray(d.home)) return { ok: false, error: 'O backup tem um início inválido.' };
  const subcontas = d.accounts.reduce((n, a) => n + (a.subs?.length || 0), 0);
  return { ok: true, savedAt: b.savedAt, data: d, summary: { lancamentos: d.tx.length, subcontas, metas: (d.metas || []).length, assinaturas: (d.assin || []).length } };
}

export function restore(s, parsed) {
  if (!parsed?.ok) throw new Error('Backup inválido: nada foi alterado.');
  const base = initialState(), d = Object.fromEntries(Object.entries(parsed.data).filter(([k]) => k in base));
  // A senha é do aparelho: restaurar nunca troca nem apaga a senha atual.
  return { ...base, ...d, prefs: { ...base.prefs, ...d.prefs, pin: s?.prefs?.pin ?? null, lock: s?.prefs?.lock ?? null }, meta: { ...base.meta, ...d.meta, lastBackup: parsed.savedAt } };
}

export function markBackup(s, nowIso) { const r = structuredClone(s); r.meta.lastBackup = nowIso; return r; }
export function backupDue(s, nowIso) {
  const last = s.meta.lastBackup;
  return !last || (Date.parse(nowIso) - Date.parse(last)) / 86400000 > 7;
}

const TIPO = { e: 'Despesa', r: 'Receita', t: 'Transferência', a: 'Ajuste' };
// Texto que começa com = + - @ viraria fórmula no Excel/Sheets: ganha um apóstrofo na frente.
const q = v => { v = /^[=+\-@\t\r]/.test(v) ? "'" + v : v; return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const money = c => (c / 100).toFixed(2).replace('.', ',');
export function toCsv(s) {
  const rows = s.tx.map(t => [fmtDate(t.date), q(t.desc || ''), q(t.cat || ''), TIPO[t.type], (t.type === 'e' ? '-' : '') + money(t.value), t.status === 'p' ? 'Pago' : 'Pendente'].join(';'));
  return ['Data;Descrição;Categoria;Tipo;Valor;Status', ...rows].join('\n');
}

export function eraseAll(confirmText) {
  if (confirmText !== 'APAGAR') throw new Error('Digite APAGAR para confirmar.');
  return initialState();
}
