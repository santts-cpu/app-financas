import { ico, esc, money, hm, lab, head, field, readForm, monthStrip, empty, monthLabel, MONTHS } from './components.js';
import { monthSummary, addTx, editTx, delTx, effectTx } from '../core/ledger.js';
import { addInstallments, addRepeat, invoiceFor } from '../core/cards.js';
import { addFavorite } from '../core/subs.js';
import { parseMoney } from '../core/money.js';
import { listOptions } from '../core/categories.js';
import { fmtDate } from '../core/dates.js';
import { txRow, accName } from './txrow.js';

const KINDS = [['geral', 'Geral'], ['contas', 'Contas'], ['cartao', 'Cartão'], ['assin', 'Assinaturas']];
const kindOf = (t, k) => (k === 'geral' ? true : k === 'contas' ? !t.card : k === 'cartao' ? !!t.card : t.cat === 'Assinaturas');
const FILT0 = { t: 'all', a: 'all', c: 'all', q: '', s: 'data' };
const filtOf = ui => ({ ...FILT0, ...(ui.filt || {}) });
const plain = c => (c / 100).toFixed(2).replace('.', ',');

// Conta/subconta/cartão escolhidos no filtro.
function accOk(a, t) {
  if (a === 'all') return true;
  if (a === 'cards') return !!t.card;
  if (a.startsWith('card:')) return t.card === Number(a.slice(5));
  const [k, id, sid] = a.split(':'), hit = x => x != null && x === Number(id);
  if (t.card || !(hit(t.acc) || (t.type === 't' && (hit(t.from) || hit(t.to))))) return false;
  const subs = [t.sub, t.fromSub, t.toSub].filter(x => x != null);
  return k === 'acc' ? true : k === 'livre' ? subs.length === 0 : subs.includes(Number(sid));
}
function accOptions(s) {
  const o = [['all', 'Todas as contas']];
  for (const a of s.accounts) { o.push([`acc:${a.id}`, `${a.name} (tudo)`], [`livre:${a.id}`, `${a.name} › Livre`]); for (const x of a.subs) o.push([`sub:${a.id}:${x.id}`, `${a.name} › ${x.name}`]); }
  o.push(['cards', 'Todos os cartões']); for (const c of s.cards) o.push([`card:${c.id}`, `Cartão ${c.name}`]);
  return o;
}

// Tudo o que a lista precisa, já filtrado e somado.
function lancData(ctx) {
  const { s, ui } = ctx, f = filtOf(ui), kind = ui.kind || 'geral', all = s.tx.filter(t => t.date.startsWith(ui.month) && t.type !== 'a');
  const counts = Object.fromEntries(KINDS.map(([k]) => [k, all.filter(t => kindOf(t, k)).length]));
  const q = f.q.trim().toLowerCase().replace(/^r\$\s*/, '');
  const final = all.filter(t => kindOf(t, kind) && (f.t === 'all' || t.type === f.t) && accOk(f.a, t) && (f.c === 'all' || t.cat === f.c)
    && (!q || (t.desc || '').toLowerCase().includes(q) || (t.cat || '').toLowerCase().includes(q) || plain(t.value).includes(q.replace('.', ','))));
  const pend = final.filter(t => t.status !== 'p'), paid = final.filter(t => t.status === 'p');
  const sum = ty => paid.filter(t => t.type === ty).reduce((n, t) => n + t.value, 0);
  return { f, kind, all, counts, final, pend, paid, rec: sum('r'), desp: sum('e') };
}

function lancTotal(ctx) {
  const { s } = ctx, d = lancData(ctx), { f, kind, final, rec, desp } = d;
  const onlyExp = kind === 'cartao' || kind === 'assin' || f.a === 'cards' || f.a.startsWith('card:');
  const recOnly = !onlyExp && f.t === 'r', expOnly = !recOnly && (onlyExp || kind === 'contas' || f.t === 'e');
  const accLabel = f.a === 'all' ? '' : (accOptions(s).find(([v]) => v === f.a) || ['', ''])[1];
  const tags = [f.t === 'r' ? 'Receitas' : f.t === 'e' ? 'Despesas' : '', accLabel, f.c !== 'all' ? f.c : '', f.q.trim() ? `“${f.q.trim()}”` : ''].filter(Boolean);
  const big = (lbl, v, col) => `<div style="display:flex;flex-direction:column"><span style="font-size:12px;color:#4A5A68">${lbl}</span><b style="font-size:22px;color:${col}">${money(v)}</b></div>`;
  const cnt = lbl => `<div style="display:flex;flex-direction:column;align-items:flex-end"><span style="font-size:12px;color:#4A5A68">${lbl}</span><b>${final.length}</b></div>`;
  const res = rec - desp, rc = res > 0 ? '#0F6B47' : res < 0 ? '#C2253F' : '#0F1B26';
  const body = expOnly ? `<div style="display:flex;justify-content:space-between;align-items:flex-end">${big('Total gasto', desp, '#C2253F')}${cnt(kind === 'assin' ? 'Assinaturas' : kind === 'cartao' || f.a === 'cards' || f.a.startsWith('card:') ? 'Compras' : 'Lançamentos')}</div>`
    : recOnly ? `<div style="display:flex;justify-content:space-between;align-items:flex-end">${big('Total recebido', rec, '#0F6B47')}${cnt('Lançamentos')}</div>`
    : `<div style="display:flex;justify-content:space-between;align-items:flex-end">${big('Receitas', rec, '#0F6B47')}${big('Despesas', desp, '#C2253F')}<div style="display:flex;flex-direction:column;align-items:flex-end"><span style="font-size:12px;color:#4A5A68">Resultado</span><b style="font-size:22px;color:${rc}">${res < 0 ? '− ' : ''}${money(Math.abs(res))}</b></div></div>`;
  return `<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px">Total do filtro</b><span style="font-size:12px;color:#4A5A68">${final.length} lançamento${final.length === 1 ? '' : 's'}</span></div>
    ${tags.length ? `<div style="font-size:12px;color:#2B4EFF;font-weight:600">${tags.map(esc).join(' · ')}</div>` : ''}${body}`;
}

function lancResults(ctx) {
  const { s } = ctx, { f, final, pend, paid } = lancData(ctx), rows = l => l.map(t => txRow(s, t)).join('');
  if (!final.length) return `<div class="card" style="padding:16px;font-size:14px;color:#4A5A68;display:flex;flex-direction:column;gap:8px">Nenhum lançamento com esse filtro.<button class="chip" data-act="clearFilt">Limpar filtros</button></div>`;
  if (f.s === 'data') {
    const by = {}; paid.forEach(t => (by[t.date] ||= []).push(t));
    return (pend.length ? `<div>${lab(`<span>Pendentes · ${pend.length}</span>`, '<span style="font-weight:500;font-size:12px">não mexem no saldo</span>')}<div style="background:#fff;border:1.5px dashed #9AA7B3;border-radius:18px;padding:0 14px">${rows(pend.slice().sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id))}</div></div>` : '')
      + Object.keys(by).sort().reverse().map(d => `<div>${lab(`<span>${fmtDate(d)}</span>`)}<div class="card" style="padding:0 14px">${rows(by[d].sort((a, b) => b.id - a.id))}</div></div>`).join('');
  }
  const l = final.slice().sort((a, b) => f.s === 'maior' ? b.value - a.value : f.s === 'menor' ? a.value - b.value : ((a.cat || '').localeCompare(b.cat || '') || (a.desc || '').localeCompare(b.desc || '')));
  return `<div>${lab(`<span>${{ maior: 'Maior valor primeiro', menor: 'Menor valor primeiro', cat: 'Por categoria' }[f.s]}</span>`)}<div class="card" style="padding:0 14px">${rows(l)}</div></div>`;
}

// [tipo, nome, cor, título do formulário, rótulo do valor, ícone, bg do ícone, legenda]
const TYPES = [['e', 'Despesa', '#F0506E', 'Nova despesa', 'Valor da despesa', 'arrup', '#FFE3E8', 'Sai de uma conta'],
  ['r', 'Receita', '#2FD08A', 'Nova receita', 'Valor da receita', 'arrdown', '#DDF6EA', 'Entra numa conta'],
  ['t', 'Transferência', '#9B72E0', 'Nova transferência', 'Valor da transferência', 'swap', '#EEE6FB', 'Entre contas'],
  ['c', 'Cartão', '#3FC7B0', 'Nova despesa cartão', 'Valor da despesa cartão', 'cartoes', '#DDF5F1', 'Compra no crédito']];
const FIELDS = ['value', 'desc', 'cat', 'acc', 'sub', 'from', 'to', 'card', 'parc', 'date', 'obs'];
const addM = k => { const [y, m] = k.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
const cents = c => (c / 100).toFixed(2).replace('.', ',');
const shift = (iso, n) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8) + n)).toISOString().slice(0, 10);

export const screens = {
  lanc(ctx) {
    const { ui } = ctx, d = lancData(ctx), m = monthSummary(ctx.s, ui.month), kind = d.kind;
    const nF = (d.f.t !== 'all') + (d.f.a !== 'all') + (d.f.s !== 'data') + (d.f.c !== 'all') + (d.f.q.trim() !== ''), res = m.receitas - m.resultado * 0 - m.despesas;
    const chip = ([k, l]) => `<button data-act="kind" data-k="${k}" style="flex:1;min-height:44px;border-radius:22px;border:1px solid ${kind === k ? '#fff' : 'rgba(255,255,255,.28)'};background:${kind === k ? '#fff' : 'transparent'};color:${kind === k ? '#0F1B26' : '#fff'};font:inherit;font-size:13px;font-weight:${kind === k ? 700 : 600};cursor:pointer;padding:0 6px;white-space:nowrap">${l} · ${d.counts[k]}</button>`;
    const col = (lbl, v, c, al = '') => `<div style="display:flex;flex-direction:column;${al}"><span style="font-size:12px;color:#A7B6C4">${lbl}</span><b style="font-size:16px;color:${c}">${v}</b></div>`;
    return `<div class="head" style="padding-bottom:8px;display:flex;align-items:flex-start;justify-content:space-between"><div><h1>Lançamentos</h1><div class="sub">${monthLabel(ui.month)}</div></div><button class="chip ${nF ? 'on' : ''}" data-act="openFilt" style="margin-top:2px">Filtros${nF ? ' · ' + nF : ''}</button></div>
    ${monthStrip(ctx)}
    <div class="pad" style="padding-top:4px">
      <div style="border-radius:22px;overflow:hidden;border:1px solid #DCE1E7">
        <div class="dark" style="border-radius:0;padding:14px 16px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between">${col('Receitas pagas', money(m.receitas), '#7FE0B5')}${col('Despesas pagas', money(m.despesas), '#FF8FA8')}${col('Resultado', (m.resultado < 0 ? '− ' : '+ ') + money(Math.abs(m.resultado)), m.resultado > 0 ? '#7FE0B5' : m.resultado < 0 ? '#FF8FA8' : '#fff', 'align-items:flex-end')}</div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.12);padding-top:8px;font-size:13px;color:#A7B6C4"><button class="btn" data-act="openFlow" data-t="r" style="border:0;background:none;color:inherit;font:inherit;justify-content:flex-start;padding:0">A receber <b style="color:#7FE0B5;margin:0 4px">${money(m.aReceber)}</b> ›</button><button class="btn" data-act="openFlow" data-t="e" style="border:0;background:none;color:inherit;font:inherit;justify-content:flex-end;padding:0">A pagar <b style="color:#FF8FA8;margin:0 4px">${money(m.aPagar)}</b> ›</button></div>
          <div style="font-size:12px;color:#A7B6C4">${m.pendentes} pendente${m.pendentes === 1 ? '' : 's'} para efetivar</div>
        </div>
        <div style="background:#2A4058;padding:12px;display:flex;gap:6px;overflow-x:auto">${KINDS.map(chip).join('')}</div>
        <div id="ltot" style="background:#fff;padding:14px 16px;display:flex;flex-direction:column;gap:8px">${lancTotal(ctx)}</div>
      </div>
      <div id="lres" style="display:flex;flex-direction:column;gap:16px">${lancResults(ctx)}</div>
    </div>
    <button class="fab" data-act="novo" aria-label="Novo lançamento">${ico('plus', '#fff', 26, 2.4)}</button>`;
  },
  fluxo(ctx) {
    const { s, ui } = ctx, r = ui.params.t !== 'e', key = ui.month;
    const list = s.tx.filter(t => t.date.startsWith(key) && (t.type === 'r') === r && (t.type === 'r' || t.type === 'e'));
    const pend = list.filter(t => t.status !== 'p').sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id), paid = list.filter(t => t.status === 'p');
    const sum = l => l.reduce((n, t) => n + t.value, 0), w = r ? ['A receber', 'Recebidos', 'recebido', 'Previsto para'] : ['A pagar', 'Pagos', 'pago', 'Vence em'];
    const col = r ? '#0F6B47' : '#A11D3A', bg = r ? '#DDF6EA' : '#FFE3E8';
    const seg = (k, l) => `<button data-act="flow" data-t="${k}" style="flex:1;min-height:44px;border:0;border-radius:14px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;background:${(r ? 'r' : 'e') === k ? '#0F1B26' : 'transparent'};color:${(r ? 'r' : 'e') === k ? '#fff' : '#4A5A68'}">${l}</button>`;
    const grp = (l, fmt, dash) => [...new Set(l.map(t => t.date))].map(d => `<div style="margin-bottom:10px"><div style="font-size:13px;font-weight:700;color:#4A5A68;padding:0 4px 6px">${fmt(d)}</div><div style="${dash ? 'background:#fff;border:1.5px dashed #9AA7B3;border-radius:18px' : 'background:#fff;border:1px solid #DCE1E7;border-radius:20px'};padding:0 14px">${l.filter(t => t.date === d).map(t => txRow(s, t)).join('')}</div></div>`).join('');
    const none = t => `<div class="card" style="padding:16px;font-size:14px;color:#4A5A68">${t}</div>`;
    return `<div style="padding:20px 8px 8px;display:flex;align-items:center;gap:4px"><button class="btn" data-act="go" data-to="${ui.params.back || 'inicio'}" aria-label="Voltar">${ico('back', '#0F1B26')}</button><h1 style="font-size:26px;line-height:32px">${r ? 'Receitas' : 'Despesas'} do mês</h1></div>
    ${monthStrip(ctx)}
    <div class="pad" style="padding-top:4px">
      <div style="display:flex;gap:4px;background:#E3E7EC;border-radius:18px;padding:4px">${seg('r', 'Receitas')}${seg('e', 'Despesas')}</div>
      <div style="background:${bg};color:${col};border-radius:20px;padding:14px 16px;display:flex;justify-content:space-between"><div style="display:flex;flex-direction:column"><span style="font-size:13px">${w[0]} · ${pend.length}</span><b class="big" style="font-size:22px">${money(sum(pend))}</b></div><div style="display:flex;flex-direction:column;align-items:flex-end"><span style="font-size:13px">${w[1]} · ${paid.length}</span><b class="big" style="font-size:22px">${money(sum(paid))}</b></div></div>
      <div>${lab(`<span>${w[0]} · ${pend.length}</span>`, '<span style="font-weight:500;font-size:12px">não mexem no saldo</span>')}${pend.length ? grp(pend, d => `${w[3]} ${fmtDate(d).slice(0, 5)}`, true) : none(`Nada ${r ? 'a receber' : 'a pagar'} neste mês.`)}</div>
      <div>${lab(`<span>${w[1]} · ${paid.length}</span>`, '<span style="font-weight:500;font-size:12px">por data</span>')}${paid.length ? grp(paid.sort((a, b) => b.date.localeCompare(a.date)), d => fmtDate(d), false) : none(`Nada ${w[2]} neste mês ainda.`)}</div>
    </div>`;
  },
};

export const sheets = {
  filt(ctx) {
    const { s, ui } = ctx, f = filtOf(ui), kind = ui.kind || 'geral';
    const cats = [...new Set(s.tx.filter(t => t.date.startsWith(ui.month) && t.type !== 'a').map(t => t.cat).filter(Boolean))].sort();
    const sel = (id, opts, cur) => `<select id="f_${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    return `<div class="sheetbg" data-act="sheetClose"><div class="sheet" role="dialog" aria-label="Filtros e busca" data-act="keep"><h2>Filtros e busca</h2>
      <label>Buscar<input id="f_q" type="search" data-input="lqInput" placeholder="Descrição, categoria ou valor" value="${esc(f.q)}" autocomplete="off"></label>
      ${kind === 'cartao' || kind === 'assin' ? '' : `<label>Tipo${sel('t', [['all', 'Receitas e despesas'], ['r', 'Só receitas'], ['e', 'Só despesas']], f.t)}</label>`}
      <label>Conta${sel('a', accOptions(s), f.a)}</label>
      <label>Categoria${sel('c', [['all', 'Todas as categorias'], ...cats.map(k => [k, k])], f.c)}</label>
      <label>Ordenar por${sel('s', [['data', 'Data'], ['maior', 'Maior valor'], ['menor', 'Menor valor'], ['cat', 'Categoria']], f.s)}</label>
      <button class="pri" data-act="applyFilt">Aplicar</button><button class="sec" data-act="clearFilt">Limpar filtros</button><button class="sec" data-act="sheetClose" style="border:0">Cancelar</button></div></div>`;
  },
  novo() {
    const btn = ([k, l, c, , , icon, bg, sub]) => `<button data-act="novoType" data-t="${k}" style="min-height:96px;border-radius:20px;border:1px solid #DCE1E7;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;padding:0 16px;text-align:left;font:inherit"><span class="ic" style="background:${bg}">${ico(icon, c, 20)}</span><b style="font-size:16px;color:#0F1B26">${l}</b><span style="font-size:12px;color:#4A5A68">${sub}</span></button>`;
    return `<div class="sheetbg" data-act="sheetClose"><div class="sheet" role="dialog" aria-label="Novo lançamento"><h2>O que você vai lançar?</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${TYPES.map(btn).join('')}</div>
      <button class="sec" data-act="sheetClose" style="border:0">Cancelar</button></div></div>`;
  },
  novoForm(ctx, d) {
    const { s } = ctx, [, , AC, title, vlabel] = TYPES.find(x => x[0] === d.type), t = d.type, tr = t === 't', isC = t === 'c', exp = t === 'e' || isC;
    const accs = s.accounts.map(a => [String(a.id), a.name]), cards = s.cards.map(c => [String(c.id), c.name]);
    const date = d.date || ctx.today, future = !tr && date > ctx.today, other = d.other || (date !== ctx.today && date !== shift(ctx.today, -1));
    const np = isC && d.pc ? Math.max(2, Number(d.parc) || 2) : 1, vtot = parseMoney(d.value || '') || 0;
    const accId = d.acc || accs[0]?.[0] || '', acc = s.accounts.find(a => String(a.id) === String(accId));
    const cats = listOptions(s, t === 'r' ? 'r' : 'e').map(c => c.name), cat = d.cat || cats[0] || 'Outros';
    const pago = d.pago !== false && !future;
    const label = (list, cur) => esc((list.find(([v]) => String(v) === String(cur)) || ['', ''])[1]);
    const pill = (id, list, cur, ch) => `<span class="npill" style="border-color:${AC}">${label(list, cur)}<select id="f_${id}" data-change="${ch || 'novoRefresh'}" aria-label="${id}">${list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></span>`;
    const sw = (key, on, lab, dis) => `<button class="nsw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${lab}" data-act="tog" data-f="${key}" ${dis ? 'disabled' : ''} style="${on ? 'background:' + AC : ''}${dis ? ';opacity:.5' : ''}"><i></i></button>`;
    const row = (icon, body, trail = '') => `<div class="nrow"><span style="width:32px;display:flex;justify-content:center;flex:none">${ico(icon, '#5B6672', 24, 1.6)}</span><div style="flex:1;display:flex;align-items:center;min-width:0;gap:8px">${body}</div>${trail}</div>`;
    const chev = ico('chev', '#5B6672', 20);
    const chip = (on, act, extra, lab) => `<button class="nchip" data-act="${act}" ${extra} style="${on ? 'background:' + AC + ';color:#fff' : ''}">${lab}</button>`;
    const subs = !tr && acc && !isC ? [['', 'Livre'], ...acc.subs.map(x => [String(x.id), x.name])] : null;
    let due = '';
    if (isC && s.cards.length) {
      const c = s.cards.find(x => String(x.id) === String(d.card || cards[0][0])) || s.cards[0], k = date.slice(0, 7), key = Number(date.slice(8)) > c.closeDay ? addM(k) : k;
      due = fmtDate(invoiceFor(s, c.id, key, ctx.today).dueDate);
    }
    const icon = isC ? 'cartoes' : 'bank';
    return `<div class="sheetbg full"><div class="sheet fullp" role="dialog" aria-label="${title}" style="background:#0F1B26;position:relative">
      <div style="background:#0F1B26;color:#fff;padding:14px 16px 22px">
        <div style="display:flex;align-items:center;gap:4px;margin-left:-8px"><button class="btn" data-act="novoBack" aria-label="Voltar">${ico('back', '#fff')}</button><b style="font-size:20px;font-weight:600">${title}</b></div>
        <div style="font-size:14px;color:#B8C2CC;margin-top:10px">${vlabel}${np > 1 ? ' total' : ''}</div>
        <input id="f_value" class="amt" inputmode="decimal" placeholder="R$ 0,00" value="${esc(d.value || '')}" aria-label="Valor" autocomplete="off">
        <div style="display:flex;gap:8px;overflow-x:auto;padding-top:4px">${[10, 20, 50, 100].map(n => `<button data-act="qv" data-n="${n}" style="white-space:nowrap;min-height:44px;border-radius:22px;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;font:inherit;font-size:14px;font-weight:600;padding:0 14px;cursor:pointer">+ ${n}</button>`).join('')}<button data-act="qv" data-n="0" style="white-space:nowrap;min-height:44px;border-radius:22px;border:0;background:transparent;color:${AC};font:inherit;font-size:14px;font-weight:700;padding:0 14px;cursor:pointer">Limpar</button></div>
        ${np > 1 && vtot > 0 ? `<div style="font-size:14px;font-weight:700;padding-top:8px;color:${AC}">${np}× de ${money(Math.round(vtot / np))}</div>` : ''}
      </div>
      <div style="flex:1;overflow:auto;background:#fff;border-radius:28px 28px 0 0;margin-top:-14px;padding:6px 20px 120px">
        ${tr || isC ? '' : row('check', `<span>${exp ? 'Pago' : 'Recebido'}</span>`, sw('pago', pago, exp ? 'Pago' : 'Recebido', future))}
        ${row('cal', `<div style="display:flex;gap:8px;flex-wrap:wrap">${chip(!other && date === ctx.today, 'dtChip', `data-d="${ctx.today}"`, 'Hoje')}${chip(!other && date === shift(ctx.today, -1), 'dtChip', `data-d="${shift(ctx.today, -1)}"`, 'Ontem')}${chip(other, 'dtOther', '', 'Outros…')}</div>`)}
        ${other ? row('cal', `<input id="f_date" class="nin" type="date" ${tr ? `max="${ctx.today}"` : ''} value="${date}" data-change="dtChange" aria-label="Data">`, `<span style="font-size:12px;color:#5B6672;max-width:120px;text-align:right">${future ? 'Futura: fica pendente' : ''}</span>`) : `<input id="f_date" type="hidden" value="${date}">`}
        ${row('pencil', `<input id="f_desc" class="nin" placeholder="Descrição" value="${esc(d.desc || '')}" aria-label="Descrição" autocomplete="off">`, tr ? '' : `<button class="btn" data-act="tog" data-f="fav" aria-label="Salvar como favorita" aria-pressed="${!!d.fav}">${ico('heart', d.fav ? AC : '#5B6672', 24, 1.8).replace('fill="none"', d.fav ? `fill="${AC}"` : 'fill="none"')}</button>`)}
        ${tr ? '' : row('bkm', pill('cat', (cats.length ? cats : ['Outros']).map(c => [c, c]), cat), chev)}
        ${tr ? row('bank', pill('from', accs, d.from || accs[0]?.[0]), chev) : isC ? row(icon, pill('card', cards, d.card || cards[0]?.[0]), chev) : row(icon, pill('acc', accs, accId), chev)}
        ${subs && subs.length > 1 ? row('bank', pill('sub', subs, d.sub || ''), chev) : ''}
        ${tr ? `<div style="text-align:center;color:#5B6672;font-size:15px;padding:14px 0 6px;border-bottom:1px solid #E3E8EE">Transferir para<div>${ico('down', '#5B6672', 22)}</div></div>${row('bank', pill('to', accs, d.to || accs[1]?.[0] || accs[0]?.[0]), chev)}` : ''}
        ${isC && due ? row('receipt', `<span>Fatura: ${due}</span>`) : ''}
        ${isC ? row('repeat', '<span>Parcelado</span>', sw('parc', np > 1, 'Parcelado')) : ''}
        ${isC && np > 1 ? row('repeat', pill('parc', [2, 3, 4, 5, 6, 8, 10, 12].map(n => [String(n), n + '×']), String(np), 'parcChange'), chev) : ''}
        ${np > 1 ? '' : row('pin', `<span>${tr ? 'Transferência fixa' : t === 'r' ? 'Receita fixa' : 'Despesa fixa'}</span>`, sw('fixa', !!d.fixa, 'Repetir todo mês'))}
        ${row('pencil', `<input id="f_obs" class="nin" placeholder="Observação" value="${esc(d.obs || '')}" aria-label="Observação" autocomplete="off">`)}
      </div>
      <button data-act="novoSave" aria-label="Salvar" style="position:absolute;left:50%;bottom:24px;transform:translateX(-50%);width:68px;height:68px;border-radius:34px;border:0;background:${AC};cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,.35)">${ico('check', '#fff', 32, 2.6)}</button>
    </div></div>`;
  },
  tx(ctx, d) {
    const t = ctx.s.tx.find(x => x.id === d.id); if (!t) return '';
    const sys = t.type === 'a' || (t.type === 't' && t.card), fields = [{ id: 'value', label: 'Valor', type: 'money', value: (Math.abs(t.value) / 100).toFixed(2).replace('.', ',') }, { id: 'desc', label: 'Descrição', value: t.desc }, { id: 'date', label: 'Data', type: 'date', value: t.date }];
    return `<div class="sheetbg"><div class="sheet" role="dialog" aria-label="Lançamento"><h2>${esc(t.desc || 'Lançamento')}</h2>${sys ? '' : fields.map(field).join('')}
      ${t.status !== 'p' ? `<button class="pri" data-act="txEffect" data-id="${t.id}">Efetivar</button>` : ''}${sys ? '' : '<button class="pri" data-act="txSave" data-id="' + t.id + '">Salvar</button>'}
      <button class="sec" data-act="txDel" data-id="${t.id}" style="${d.conf ? 'color:#fff;background:#C2253F;border-color:#C2253F' : 'color:#A11D3A'}">${d.conf ? 'Confirmar exclusão' : 'Excluir'}</button><button class="sec" data-act="sheetClose">Fechar</button></div></div>`;
  },
};

export const acts = {
  kind(ctx, d) { ctx.ui.kind = d.k; if (d.k === 'cartao' || d.k === 'assin') ctx.ui.filt = { ...filtOf(ctx.ui), t: 'all' }; ctx.render(); },
  openFilt(ctx) { ctx.openSheet('filt'); },
  // a busca atualiza o total e a lista enquanto você digita, sem fechar a folha
  lqInput(ctx, d, root, el) {
    ctx.ui.filt = { ...filtOf(ctx.ui), q: el.value };
    const tot = root.querySelector('#ltot'), res = root.querySelector('#lres'); if (tot) tot.innerHTML = lancTotal(ctx); if (res) res.innerHTML = lancResults(ctx);
  },
  applyFilt(ctx, d, root) {
    const v = id => root.querySelector('#f_' + id)?.value, f = filtOf(ctx.ui);
    ctx.ui.filt = { q: v('q') ?? f.q, t: v('t') ?? f.t, a: v('a') ?? f.a, c: v('c') ?? f.c, s: v('s') ?? f.s }; ctx.closeSheet();
  },
  clearFilt(ctx) { ctx.ui.filt = { ...FILT0 }; ctx.closeSheet(); },
  openFlow(ctx, d) { ctx.go('fluxo', { t: d.t, back: ctx.ui.screen === 'fluxo' ? ctx.ui.params.back : ctx.ui.screen }); },
  flow(ctx, d) { ctx.ui.params = { ...ctx.ui.params, t: d.t }; ctx.render(); },
  efetivar(ctx, d) { ctx.set(effectTx(ctx.s, Number(d.id))); },
  novo(ctx) { ctx.openSheet('novo'); },
  novoType(ctx, d) { ctx.openSheet('novoForm', { type: d.t }); },
  novoBack(ctx) { ctx.openSheet('novo'); },
  novoRefresh(ctx, d, root, el) { acts.keep(ctx, root); },
  parcChange(ctx, d, root) { acts.keep(ctx, root); },
  dtChange(ctx, d, root) { acts.keep(ctx, root); },
  // guarda o que foi digitado e redesenha o formulário
  keep(ctx, root, patch = {}) {
    const cur = ctx.ui.sheet.d, got = {};
    for (const id of FIELDS) { const e = root.querySelector('#f_' + id); if (e) got[id] = e.value; }
    ctx.openSheet('novoForm', { ...cur, ...got, ...patch });
  },
  qv(ctx, d, root) {
    const e = root.querySelector('#f_value'), n = Number(d.n);
    acts.keep(ctx, root, { value: n ? cents((parseMoney(e.value) || 0) + n * 100) : '' });
  },
  tog(ctx, d, root) {
    const cur = ctx.ui.sheet.d, f = d.f;
    if (f === 'parc') return acts.keep(ctx, root, { pc: !cur.pc, parc: cur.pc ? 1 : (cur.parc > 1 ? cur.parc : 2) });
    if (f === 'pago') return acts.keep(ctx, root, { pago: cur.pago === false });
    return acts.keep(ctx, root, { [f]: !cur[f] });
  },
  dtChip(ctx, d, root) { acts.keep(ctx, root, { date: d.d, other: false }); },
  dtOther(ctx, d, root) { acts.keep(ctx, root, { other: true }); },
  novoSave(ctx, d, root) {
    const cur = ctx.ui.sheet.d, type = cur.type, v = { ...Object.fromEntries(FIELDS.map(id => [id, root.querySelector('#f_' + id)?.value ?? ''])) };
    const value = parseMoney(v.value);
    if (!value || value <= 0) throw new Error('Informe um valor maior que zero.');
    const date = v.date || ctx.today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Informe uma data válida.');
    const future = date > ctx.today;
    if (type === 't' && future) throw new Error('Transferência não pode ter data futura.');
    const status = future || cur.pago === false ? 'n' : 'p';
    const base = { value, desc: v.desc || v.cat || (type === 'r' ? 'Receita' : type === 't' ? 'Transferência' : 'Despesa'), date, ...(v.obs ? { note: v.obs } : {}) };
    const rep = (s, tx) => (cur.fixa && !cur.pc ? addRepeat(s, tx) : addTx(s, tx));
    let next, fav = null;
    if (type === 't') {
      const from = v.from || String(ctx.s.accounts[0]?.id), to = v.to || String(ctx.s.accounts[1]?.id ?? ctx.s.accounts[0]?.id);
      if (from === to) throw new Error('Escolha contas diferentes.');
      next = rep(ctx.s, { ...base, type: 't', status: 'p', from: Number(from), to: Number(to), cat: 'Transferência' });
    } else if (type === 'c') {
      const card = v.card || String(ctx.s.cards[0]?.id || '');
      if (!card) throw new Error('Cadastre um cartão primeiro.');
      const tx = { ...base, type: 'e', status: 'p', cat: v.cat || 'Outros', card: Number(card) }, n = cur.pc ? Number(v.parc) || 2 : 1;
      next = n > 1 ? addInstallments(ctx.s, tx, n) : rep(ctx.s, tx);
      fav = { type: 'e', desc: base.desc, cat: tx.cat, value, card: tx.card };
    } else {
      const acc = v.acc || String(ctx.s.accounts[0]?.id || '');
      if (!acc) throw new Error('Cadastre uma conta primeiro.');
      const tx = { ...base, type, status, cat: v.cat || 'Outros', acc: Number(acc), ...(v.sub ? { sub: Number(v.sub) } : {}) };
      next = rep(ctx.s, tx);
      fav = { type, desc: base.desc, cat: tx.cat, value, acc: tx.acc, ...(tx.sub ? { sub: tx.sub } : {}) };
    }
    if (cur.fav && fav) next = addFavorite(next, fav);
    ctx.ui.sheet = null; ctx.set(next); ctx.toast('Lançamento salvo.');
  },
  openTx(ctx, d) { ctx.openSheet('tx', { id: Number(d.id) }); },
  txEffect(ctx, d) { ctx.ui.sheet = null; ctx.set(effectTx(ctx.s, Number(d.id))); },
  txSave(ctx, d, root) {
    const v = readForm(root, [{ id: 'value' }, { id: 'desc' }, { id: 'date' }]), value = parseMoney(v.value);
    if (!value || value <= 0) throw new Error('Informe um valor maior que zero.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date || '') || new Date(v.date).toISOString().slice(0, 10) !== v.date) throw new Error('Informe uma data válida.');
    ctx.ui.sheet = null; ctx.set(editTx(ctx.s, Number(d.id), { value, desc: v.desc, date: v.date }));
  },
  txDel(ctx, d) {
    if (!ctx.ui.sheet.d.conf) return ctx.openSheet('tx', { ...ctx.ui.sheet.d, conf: true });
    ctx.ui.sheet = null; ctx.set(delTx(ctx.s, Number(d.id)));
  },
};
