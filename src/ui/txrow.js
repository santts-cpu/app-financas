import { ico, esc, money } from './components.js';
import { fmtDate } from '../core/dates.js';

export const accName = (s, id) => s.accounts.find(a => a.id === id)?.name || '—';
export const cardName = (s, id) => s.cards.find(c => c.id === id)?.name || '—';
export const originOf = (s, t) => (t.card ? 'Cartão ' + cardName(s, t.card) : t.type === 't' ? `${accName(s, t.from)} › ${t.to ? accName(s, t.to) : 'Fatura'}` : accName(s, t.acc));

export function txRow(s, t) {
  const pend = t.status !== 'p', adj = t.type === 'a' || (t.type === 't' && t.card);
  const col = t.type === 'r' ? '#0F6B47' : t.type === 'e' ? '#C2253F' : '#4A5A68';
  const icon = t.card && t.type !== 't' ? 'cartoes' : t.type === 'r' ? 'arrdown' : t.type === 'e' ? 'arrup' : 'swap';
  const bg = t.type === 'r' ? '#DDF6EA' : t.type === 'e' ? '#FFE3E8' : '#E7EBEF';
  const sign = t.type === 'r' ? '+ ' : t.type === 'e' ? '− ' : t.type === 'a' && t.value < 0 ? '− ' : t.type === 'a' ? '+ ' : '';
  const dd = fmtDate(t.date).slice(0, 5), where = esc(originOf(s, t));
  const sub = pend ? `${esc(t.cat || '')} · ${t.type === 'r' ? 'prevista' : 'vence'} ${dd} · ${where}` : `${esc(t.cat || '')} · ${where}${adj ? ' · fora de receitas e despesas' : ''}`;
  const circle = pend ? `border:1.5px solid ${col}` : `background:${bg}`;
  return `<div class="row" data-act="openTx" data-id="${t.id}" role="button" tabindex="0" aria-label="Abrir ${esc(t.desc || t.cat || 'lançamento')}" style="width:100%;cursor:pointer;min-height:${pend ? 72 : 64}px;gap:12px">
    <span class="ic" style="${circle}">${ico(icon, col, 18)}</span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column"><b style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.desc || t.cat || 'Lançamento')}</b><span style="font-size:12px;color:#4A5A68">${sub}</span>${t.note ? `<span style="font-size:12px;color:#7F8B96;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.note)}</span>` : ''}</span>
    <span style="display:flex;flex-direction:column;align-items:flex-end"><b style="color:${col};font-size:15px">${sign}${money(Math.abs(t.value))}</b>${pend && !adj ? `<button class="btn link" data-act="efetivar" data-id="${t.id}" style="margin:-8px 0">Efetivar</button>` : ''}</span></div>`;
}
