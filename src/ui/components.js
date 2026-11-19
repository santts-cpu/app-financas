import { ico, esc } from './icons.js';
import { fmtMoney } from '../core/money.js';
import { addMonths } from '../core/dates.js';

export { ico, esc };
export const NAV = {
  inicio: ['Início', 'Início'], lanc: ['Lançamentos', 'Lançam.'], contas: ['Contas', 'Contas'], plano: ['Plano', 'Plano'],
  metas: ['Metas', 'Metas'], assin: ['Assinaturas', 'Assin.'], cartoes: ['Cartões', 'Cartões'], categ: ['Categorias', 'Categ.'], capital: ['Capital', 'Capital'],
};
export const BAR_MAX = 5;
export const DEFAULT_BAR = ['inicio', 'lanc', 'contas', 'plano', 'capital'];
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const GCOL = ['#2B4EFF', '#D12F4B', '#E0A100', '#2FA97A', '#8A5CE0', '#E07A3A', '#3FA7C7', '#B24FB5'];

export const money = c => fmtMoney(c);
export const hm = (ctx, c) => (ctx.s.prefs.hideVals ? 'R$ ••••' : fmtMoney(c));
export const monthLabel = key => { const [y, m] = key.split('-'); return `${MONTHS[Number(m) - 1]} de ${y}`; };
export const pct0 = p => Math.round(Number.isFinite(p) ? p : 0);

export const sw = (act, on, label, extra = '') => `<button class="nsw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${label}" data-act="${act}" ${extra} style="${on ? 'background:#2B4EFF' : ''}"><i></i></button>`;
export const titleLink = (to, label) => `<button class="btn" data-act="go" data-to="${to}" aria-label="Abrir ${label}" style="min-height:44px;padding:0 4px;margin-left:-4px;font:inherit;font-size:13px;font-weight:600;color:#4A5A68;gap:2px">${label}${ico('chev', '#4A5A68', 14, 2.4)}</button>`;
export const lab = (inner, right = '') => `<div class="lab" style="align-items:center">${inner}${right}</div>`;
export const strip = (label, value) => `<div style="background:#0F1B26;padding:0 16px;min-height:56px;display:flex;justify-content:space-between;align-items:center;color:#fff"><b style="font-size:15px">${label}</b><b style="font-size:18px">${value}</b></div>`;
export const boxed = (body, footer = '') => `<div style="border:1px solid #DCE1E7;border-radius:20px;overflow:hidden;background:#fff"><div style="padding:4px 16px">${body}</div>${footer}</div>`;
export const splitBar = parts => `<div style="display:flex;height:14px;border-radius:7px;background:#E7EBEF;overflow:hidden;gap:2px">${parts.filter(p => p.v > 0).map(p => `<div style="flex:${p.v} 1 0;background:${p.col}"></div>`).join('')}</div>`;
export const track = (pct, col, h = 8) => `<div class="trk" style="height:${h}px;border-radius:${h / 2}px"><div style="width:${Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0))}%;background:${col}"></div></div>`;
export const empty = txt => `<div style="padding:16px 0;font-size:14px;color:#4A5A68">${txt}</div>`;
export const head = (title, sub = '', back = '') => `<div class="head" style="padding-bottom:6px;display:flex;align-items:center;gap:6px">${back ? `<button class="btn" data-act="go" data-to="${back}" aria-label="Voltar">${ico('back', '#0F1B26', 24)}</button>` : ''}<div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;

// Folha com formulário. fields: [{id,label,type,value,options:[[v,l]],placeholder}]. Os valores são lidos por #f_<id>.
export const field = f => {
  const id = `f_${f.id}`, v = f.value ?? '';
  if (f.type === 'select') return `<label>${f.label}<select id="${id}" ${f.change ? `data-change="${f.change}"` : ''}>${f.options.map(([val, l]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  return `<label>${f.label}<input id="${id}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" inputmode="${f.type === 'money' ? 'decimal' : ''}"></label>`;
};
export const formSheet = (title, fields, saveAct, saveLabel = 'Salvar', extra = '') =>
  `<div class="sheetbg"><div class="sheet" role="dialog" aria-label="${esc(title)}"><h2>${esc(title)}</h2>${fields.map(field).join('')}${extra}<button class="pri" data-act="${saveAct}">${saveLabel}</button><button class="sec" data-act="sheetClose">Cancelar</button></div></div>`;
export const readForm = (root, fields) => Object.fromEntries(fields.map(f => [f.id, root.querySelector('#f_' + f.id)?.value ?? '']));

export function monthStrip(ctx) {
  const k = ctx.ui.month, [y, m] = k.split('-').map(Number);
  const side = (key, dir) => `<button class="btn" data-act="month" data-k="${key}" aria-label="${MONTHS[Number(key.split('-')[1]) - 1]}" style="flex:1;opacity:.38;font-size:15px;font-weight:600;gap:2px;justify-content:${dir < 0 ? 'flex-start' : 'flex-end'}">${dir < 0 ? ico('back', '#0F1B26', 16) + MONTHS[Number(key.split('-')[1]) - 1].slice(0, 9) : MONTHS[Number(key.split('-')[1]) - 1].slice(0, 9) + ico('chev', '#0F1B26', 16)}</button>`;
  return `<div style="display:flex;align-items:center;padding:0 16px 8px">${side(addMonths(k, -1), -1)}<b style="font-size:18px;flex:none;padding:0 8px">${MONTHS[m - 1]}</b>${side(addMonths(k, 1), 1)}</div>`;
}

