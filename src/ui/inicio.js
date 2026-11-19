import { ico, esc, hm, money, titleLink, lab, strip, boxed, splitBar, track, empty, sw, formSheet, GCOL, pct0, monthLabel, monthStrip } from './components.js';
import { accountView, monthSummary } from '../core/ledger.js';
import { invoiceFor } from '../core/cards.js';
import { planRows, alertRows, alertKey, dismissAlert } from '../core/plan.js';
import { goalInfo } from '../core/goals.js';
import { nextCharges, assinTotal, useFavorite } from '../core/subs.js';
import { backupDue } from '../core/backup.js';
import { fmtDate } from '../core/dates.js';
import { txRow, accName } from './txrow.js';

const shown = s => s.accounts.filter(a => !(s.prefs.hideAcc || []).includes(a.id));

function banner(ctx) {
  const parts = [];
  if (backupDue(ctx.s, new Date().toISOString())) parts.push(`<div style="background:#FFF1CC;border-radius:16px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="font-size:14px;color:#5B3F00">Faz mais de 7 dias sem backup.</span><button class="btn link" data-act="go" data-to="backup" style="min-height:44px">Fazer backup</button></div>`);
  const rs = alertRows(ctx.s, ctx.ui.month);
  if (rs.length) {
    const over = rs.filter(r => r.pct > 100), near = rs.filter(r => r.pct <= 100), txt = [];
    if (over.length) txt.push(over.map(r => `<b>${esc(r.group.n)}</b> (${pct0(r.pct)}%)`).join(', ') + ' passou do planejado.');
    if (near.length) txt.push(near.map(r => `<b>${esc(r.group.n)}</b> (${pct0(r.pct)}%)`).join(', ') + ' está perto do limite.');
    parts.push(`<div role="alert" style="background:${over.length ? '#FFE3E8' : '#FFF1CC'};color:${over.length ? '#5E0F22' : '#5B3F00'};border-radius:16px;padding:10px 14px;display:flex;align-items:center;gap:10px">${ico('warn', over.length ? '#A11D3A' : '#7A5200', 22)}<button class="btn" data-act="go" data-to="plano" style="flex:1;text-align:left;justify-content:flex-start;font:inherit;font-size:14px;color:inherit">${txt.join(' ')}</button><button class="btn" data-act="alertDismiss" aria-label="Dispensar aviso">${ico('close', 'currentColor', 20)}</button></div>`);
  }
  return parts.join('');
}

const blocks = {
  saldo(ctx) {
    const { s } = ctx, m = monthSummary(s, ctx.ui.month), tot = s.accounts.reduce((n, a) => n + accountView(s, a.id).total, 0);
    return `<div class="dark" style="display:flex;flex-direction:column;gap:10px"><div style="font-size:13px;color:#A7B6C4">Saldo em contas</div><div class="big" style="font-size:38px;line-height:42px">${hm(ctx, tot)}</div>
      <div style="height:1px;background:rgba(255,255,255,.14)"></div>
      <div style="display:flex;justify-content:space-between"><button class="btn" data-act="go" data-to="lanc" style="flex-direction:column;align-items:flex-start;justify-content:flex-start;font:inherit;color:#fff;min-height:0"><span style="font-size:13px;color:#A7B6C4">Receitas pagas</span><b class="big" style="font-size:20px;color:#7FE0B5">${money(m.receitas)}</b></button><button class="btn" data-act="go" data-to="lanc" style="flex-direction:column;align-items:flex-end;justify-content:flex-start;font:inherit;color:#fff;min-height:0"><span style="font-size:13px;color:#A7B6C4">Despesas pagas</span><b class="big" style="font-size:20px;color:#FF8FA8">${money(m.despesas)}</b></button></div>
      <div style="font-size:13px;color:#A7B6C4">Resultado do mês <b style="color:#fff">${m.resultado >= 0 ? '+ ' : '− '}${money(Math.abs(m.resultado))}</b></div></div>`;
  },
  pend(ctx) {
    const m = monthSummary(ctx.s, ctx.ui.month), n = k => ctx.s.tx.filter(t => t.date.startsWith(ctx.ui.month) && t.status !== 'p' && t.type === k).length;
    const c = (bg, fg, label, v) => `<button class="btn" data-act="go" data-to="lanc" style="flex:1;background:${bg};color:${fg};border-radius:20px;padding:12px 14px;flex-direction:column;align-items:flex-start;justify-content:flex-start;font:inherit;min-height:0"><span style="font-size:13px">${label}</span><b class="big" style="font-size:20px">${money(v)}</b></button>`;
    return `<div style="display:flex;gap:10px">${c('#DDF6EA', '#0F6B47', `A receber · ${n('r')}`, m.aReceber)}${c('#FFE3E8', '#5E0F22', `A pagar · ${n('e')}`, m.aPagar)}</div>`;
  },
  contas(ctx) {
    const { s } = ctx, list = shown(s);
    const rows = list.map(a => {
      const v = accountView(s, a.id), parts = [...v.subs.map((x, i) => ({ v: Math.max(0, x.value), col: GCOL[(i + 1) % GCOL.length] })), { v: Math.max(0, v.livre), col: '#7FE0B5' }];
      return `<button class="grp btn" data-act="go" data-to="contas" style="width:100%;text-align:left;flex-direction:column;align-items:stretch;gap:6px;padding:12px 0;font:inherit"><div style="display:flex;justify-content:space-between"><b style="font-size:16px">${esc(a.name)}</b><b>${hm(ctx, v.total)}</b></div>${splitBar(parts)}<span style="font-size:12px;color:#4A5A68">Livre ${hm(ctx, v.livre)}${v.subs.length ? ' · ' + v.subs.length + ' subconta' + (v.subs.length > 1 ? 's' : '') : ''}</span></button>`;
    }).join('') || empty('Nenhuma conta exibida. Toque em Escolher.');
    const all = list.length === s.accounts.length, tot = list.reduce((n, a) => n + accountView(s, a.id).total, 0);
    return `<div>${lab(titleLink('contas', 'Contas'), `<button class="btn link" data-act="openHomeAcc" style="min-height:44px">Escolher</button>`)}${boxed(rows, strip(all ? 'Total em contas' : 'Total das contas exibidas', hm(ctx, tot)))}</div>`;
  },
  cartoes(ctx) {
    const { s } = ctx, ab = ctx.ui.cardTab !== 'fe', k = ctx.ui.month;
    const list = s.cards.map(c => ({ c, inv: invoiceFor(s, c.id, k, ctx.today) })).filter(x => (x.inv.status === 'aberta') === ab && x.inv.status !== 'paga' || (!ab && x.inv.status === 'paga'));
    const rows = list.map(({ c, inv }) => `<button class="grp btn" data-act="go" data-to="cartoes" style="width:100%;text-align:left;justify-content:space-between;padding:12px 0;font:inherit"><span style="display:flex;flex-direction:column"><b style="font-size:16px">${esc(c.name)}</b><span style="font-size:12px;color:#4A5A68">Fecha em ${fmtDate(inv.closeDate).slice(0, 5)} · melhor dia ${c.closeDay + 1}</span></span><b>${money(inv.total)}</b></button>`).join('') || empty('Nenhuma fatura aqui.');
    const tot = list.reduce((n, x) => n + x.inv.total, 0);
    const chips = `<div style="display:flex;gap:6px"><button class="chip ${ab ? 'on' : ''}" data-act="cardTab" data-t="ab" style="min-height:44px;padding:0 12px;font-size:13px">Abertas</button><button class="chip ${!ab ? 'on' : ''}" data-act="cardTab" data-t="fe" style="min-height:44px;padding:0 12px;font-size:13px">Fechadas</button></div>`;
    return `<div>${lab(titleLink('cartoes', 'Cartões de crédito'), chips)}${boxed(rows, ab ? strip('Total das faturas abertas', money(tot)) : '')}</div>`;
  },
  plano(ctx) {
    const pr = planRows(ctx.s, ctx.ui.month); if (!pr) return '';
    const rw = pr.renda > 0 ? 100 / pr.renda : 0, pago = pr.rows.reduce((n, r) => n + r.pago, 0), prev = pr.rows.reduce((n, r) => n + r.prev, 0);
    return `<button data-act="go" data-to="plano" class="card" style="text-align:left;cursor:pointer;padding:14px 16px;display:flex;flex-direction:column;gap:8px;font:inherit;color:inherit"><div style="display:flex;justify-content:space-between"><b style="font-size:16px">Plano do mês</b><span style="font-size:13px;color:#4A5A68">renda base ${money(pr.renda)}</span></div>
      <div class="trk" style="height:12px;border-radius:6px"><div style="width:${Math.min(100, pago * rw)}%;background:#2B4EFF"></div><div style="width:${Math.max(0, Math.min(100 - pago * rw, prev * rw))}%;background:#AEBBFF"></div></div><div style="font-size:13px;color:#4A5A68">Pago ${money(pago)} · Previsto ${money(prev)}</div></button>`;
  },
  ultimos(ctx) {
    const l = ctx.s.tx.filter(t => t.status === 'p' && t.date.startsWith(ctx.ui.month)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 3);
    return `<div>${lab(titleLink('lanc', 'Últimos lançamentos'))}<div class="card" style="padding:0 14px">${l.map(t => txRow(ctx.s, t)).join('') || empty('Nada pago neste mês ainda.')}</div></div>`;
  },
  metas(ctx) {
    const l = ctx.s.metas.filter(m => !m.done).slice(0, 3);
    return `<div>${lab(titleLink('metas', 'Metas'))}<div class="card" style="padding:4px 16px">${l.map(m => { const i = goalInfo(ctx.s, m, ctx.today); return `<div class="grp" style="padding:10px 0"><div style="display:flex;justify-content:space-between"><b style="font-size:15px">${esc(m.name)}</b><span style="font-size:13px;color:#4A5A68">${hm(ctx, i.saved)} de ${money(m.target)}</span></div><div style="margin-top:6px">${track(i.pct, m.color)}</div></div>`; }).join('') || empty('Nenhuma meta ativa.')}</div></div>`;
  },
  assin(ctx) {
    const all = nextCharges(ctx.s, ctx.today), nx = all.slice(0, 3), more = all.length - nx.length;
    const rows = nx.map(o => { const hoje = o.date === ctx.today; return `<div class="grp" style="display:flex;align-items:center;gap:12px;padding:10px 0"><span style="min-width:54px;text-align:center;font-size:12px;font-weight:700;border-radius:10px;padding:5px 8px;background:${hoje ? '#FFC24B' : '#E7EBEF'}">${hoje ? 'hoje' : fmtDate(o.date).slice(0, 5)}</span><b style="flex:1;font-size:15px">${esc(o.assin.name)}</b><b style="font-size:15px">${money(o.assin.value)}</b></div>`; }).join('') || empty('Nenhuma assinatura ativa.');
    return `<div>${lab(titleLink('assin', 'Assinaturas'))}${boxed(`<div style="padding:10px 0 2px;font-size:12px;color:#4A5A68">Próximas cobranças</div>${rows}${more > 0 ? `<div style="padding:8px 0 10px;font-size:12px;color:#4A5A68">e mais ${more} ${more === 1 ? 'assinatura' : 'assinaturas'}</div>` : ''}`, strip('Total por mês', money(assinTotal(ctx.s).month)))}</div>`;
  },
  categorias(ctx) {
    const pr = planRows(ctx.s, ctx.ui.month); if (!pr) return '';
    const tot = monthSummary(ctx.s, ctx.ui.month).despesas, W = v => (tot > 0 ? v / tot * 100 : 0);
    const its = pr.rows.map((r, i) => ({ n: r.group.n, v: r.pago, col: GCOL[i % GCOL.length], over: r.pct > 100 })).concat([{ n: 'Fora dos grupos', v: pr.fora, col: '#9AA7B3', over: false }]);
    const rows = its.map(r => `<div class="grp" style="display:flex;align-items:center;gap:10px;padding:10px 0"><span style="width:12px;height:12px;border-radius:4px;background:${r.col};flex:none"></span><span style="flex:1;display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b style="font-size:15px">${esc(r.n)}</b>${r.over ? '<span style="background:#FFE3E8;color:#A11D3A;font-size:11px;font-weight:700;border-radius:10px;padding:2px 8px">passou do limite</span>' : ''}</span><span style="display:flex;flex-direction:column;align-items:flex-end"><b style="font-size:15px">${money(r.v)}</b><span style="font-size:12px;color:#4A5A68">${pct0(W(r.v))}% do gasto</span></span></div>`).join('');
    return `<div>${lab(titleLink('plano', 'Despesas por grupo'))}${boxed(`<div style="padding-top:10px">${splitBar(its)}</div>${rows}`, strip('Despesas pagas no mês', money(tot)))}</div>`;
  },
  favoritas(ctx) {
    return `<div>${lab('<span>Transações favoritas</span>', '<span style="font-weight:500;font-size:12px">toque para lançar</span>')}<div class="card" style="padding:0 16px">${ctx.s.favs.map(f => `<button class="row btn" data-act="fav" data-id="${f.id}" style="width:100%;text-align:left;min-height:56px;justify-content:space-between;padding:0"><span style="display:flex;flex-direction:column"><b style="font-size:15px">${esc(f.desc)}</b><span style="font-size:12px;color:#4A5A68">${esc(f.cat)}</span></span><b>− ${money(f.value)}</b></button>`).join('') || empty('Nenhuma favorita ainda.')}</div></div>`;
  },
  venc(ctx) {
    const l = ctx.s.tx.filter(t => t.status !== 'p' && t.date.startsWith(ctx.ui.month)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    return l.length ? `<div>${lab(titleLink('lanc', 'Próximos vencimentos'))}<div style="background:#fff;border:1.5px dashed #9AA7B3;border-radius:18px;padding:0 14px">${l.map(t => txRow(ctx.s, t)).join('')}</div></div>` : '';
  },
};
export const BLOCK_NAMES = { saldo: 'Saldo, receitas e despesas', pend: 'A receber e a pagar', contas: 'Contas', cartoes: 'Cartões de crédito', plano: 'Plano do mês', ultimos: 'Últimos lançamentos', metas: 'Metas', assin: 'Assinaturas', categorias: 'Despesas por grupo', favoritas: 'Transações favoritas', venc: 'Próximos vencimentos' };

export const screens = {
  inicio(ctx) {
    const { s } = ctx;
    return `<div class="head" style="display:flex;justify-content:space-between;align-items:flex-start"><div><h1>Início</h1><div class="sub">${monthLabel(ctx.ui.month)}</div></div>
      <div style="display:flex;gap:6px"><button class="btn" data-act="toggleVals" aria-label="${s.prefs.hideVals ? 'Mostrar valores' : 'Esconder valores'}" style="background:#fff;border-radius:22px;border:1px solid #DCE1E7">${ico(s.prefs.hideVals ? 'eyeoff' : 'eye', '#0F1B26', 22)}</button><button class="btn" data-act="go" data-to="config" aria-label="Configurações" style="background:#fff;border-radius:22px;border:1px solid #DCE1E7">${ico('gear', '#0F1B26', 22)}</button></div></div>
      ${monthStrip(ctx)}<div class="pad">${banner(ctx)}${s.home.map(k => blocks[k]?.(ctx) || '').join('') || '<div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhum bloco na tela. Adicione em Configurações > Gerenciar início.</div>'}</div>
      <button class="fab" data-act="novo" aria-label="Novo lançamento">${ico('plus', '#fff', 26, 2.4)}</button>`;
  },
};

export const sheets = {
  homeAcc(ctx) {
    const { s } = ctx;
    return `<div class="sheetbg"><div class="sheet" role="dialog" aria-label="Contas na tela inicial"><h2>Contas na tela inicial</h2>${s.accounts.map(a => `<div class="nrow"><span style="flex:1">${esc(a.name)}</span>${sw('homeAcc', !(s.prefs.hideAcc || []).includes(a.id), a.name, `data-id="${a.id}"`)}</div>`).join('')}<button class="pri" data-act="sheetClose">Pronto</button></div></div>`;
  },
};

export const acts = {
  toggleVals(ctx) { const r = structuredClone(ctx.s); r.prefs.hideVals = !r.prefs.hideVals; ctx.set(r); },
  alertDismiss(ctx) { let r = ctx.s; for (const x of alertRows(r, ctx.ui.month)) r = dismissAlert(r, alertKey(x)); ctx.set(r); },
  cardTab(ctx, d) { ctx.ui.cardTab = d.t; ctx.render(); },
  openHomeAcc(ctx) { ctx.openSheet('homeAcc'); },
  homeAcc(ctx, d) {
    const r = structuredClone(ctx.s), id = Number(d.id), h = (r.prefs.hideAcc ||= []);
    r.prefs.hideAcc = h.includes(id) ? h.filter(x => x !== id) : [...h, id]; ctx.set(r); ctx.ui.sheet = { k: 'homeAcc', d: {} }; ctx.render();
  },
  fav(ctx, d) { ctx.set(useFavorite(ctx.s, Number(d.id), ctx.today)); ctx.toast('Lançado.'); },
};
