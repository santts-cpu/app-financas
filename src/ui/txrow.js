import { ico, esc, money } from './components.js';
import { fmtDate } from '../core/dates.js';

export const accName = (s, id) => s.accounts.find(a => a.id === id)?.name || '—';
export const cardName = (s, id) => s.cards.find(c => c.id === id)?.name || '—';
export const originOf = (s, t) => (t.card ? 'Cartão ' + cardName(s, t.card) : t.type === 't' ? `${accName(s, t.from)} › ${t.to ? accName(s, t.to) : 'Fatura'}` : accName(s, t.acc));

export function txRow(s, t) {
  const pend = t.status !== 'p', col = t.type === 'r' ? '#0F6B47' : t.type === 'e' ? '#C2253F' : '#4A5A68';
  const icon = t.card ? 'cartoes' : t.type === 'r' ? 'arrdown' : t.type === 'e' ? 'arrup' : 'swap';
  const bg = t.type === 'r' ? '#DDF6EA' : t.type === 'e' ? '#FFE3E8' : '#E7EBEF';
  const sign = t.type === 'r' ? '+ ' : t.type === 'e' ? '− ' : t.type === 'a' && t.value < 0 ? '− ' : t.type === 'a' ? '+ ' : '';
  return `<button class="row btn" data-act="openTx" data-id="${t.id}" style="width:100%;text-align:left;min-height:62px;justify-content:space-between;gap:12px;padding:0;opacity:${pend ? .7 : 1}">
    <span class="ic" style="background:${bg}">${ico(icon, col, 20)}</span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column"><b style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.desc || t.cat || 'Lançamento')}</b><span style="font-size:12px;color:#4A5A68">${esc(t.cat || '')} · ${esc(originOf(s, t))}${pend ? ' · pendente ' + fmtDate(t.date).slice(0, 5) : ''}</span></span>
    <b style="color:${col};font-size:15px">${sign}${money(Math.abs(t.value))}</b></button>`;
}
