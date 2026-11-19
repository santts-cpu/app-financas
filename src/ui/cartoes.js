import { ico, esc, money, hm, lab, monthStrip, formSheet, readForm, track, pct0, empty, MONTHS } from './components.js';
import { addCard, editCard, invoiceFor, payInvoice, cardUsed, futureInstallments, bestPurchaseDay } from '../core/cards.js';
import { parseMoney } from '../core/money.js';
import { fmtDate } from '../core/dates.js';
import { txRow } from './txrow.js';

const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
const br = c => (c / 100).toFixed(2).replace('.', ',');
const mname = key => MONTHS[Number(key.slice(5, 7)) - 1].toLowerCase();

export const screens = {
  cartoes(ctx) {
    const { s, ui } = ctx, sel = s.cards.find(c => c.id === ui.cardSel) || s.cards[0], plus = `<button class="btn" data-act="cardNew" aria-label="Novo cartão" style="background:#2B4EFF;border-radius:22px">${ico('plus', '#fff', 22, 2.5)}</button>`;
    if (!sel) return `<div style="padding:20px 20px 4px;display:flex;align-items:center;justify-content:space-between"><div><h1>Cartões</h1><div class="sub" style="margin-top:6px">Faturas e limite</div></div>${plus}</div><div class="pad"><div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhum cartão ainda.</div></div>`;
    const key = ui.month, todayKey = ctx.today.slice(0, 7), inv = invoiceFor(s, sel.id, key, ctx.today);
    const future = key > todayKey, isNow = key === todayKey;
    const status = future ? 'Prevista' : inv.status === 'paga' ? 'Paga' : inv.parcial ? 'Paga em parte' : inv.status === 'fechada' ? 'Fechada' : 'Aberta';
    const stCol = { Aberta: '#7FE0B5', 'Paga em parte': '#7FE0B5', Paga: '#C9D3DC', Fechada: '#FFC24B', Prevista: '#FFC24B' }[status];
    const value = isNow ? inv.restante : inv.total, note = inv.pago > 0 ? `Total ${money(inv.total)} · já pago ${money(inv.pago)}` : future ? 'Só compras e parcelas já lançadas.' : '';
    const byCat = Object.entries(inv.items.reduce((m, t) => ((m[t.cat || 'Sem categoria'] = (m[t.cat || 'Sem categoria'] || 0) + t.value), m), {})).sort((a, b) => b[1] - a[1]), tot = inv.total || 1;
    const used = cardUsed(s, sel.id), lim = sel.limit || 0, pct = lim ? Math.min(100, used / lim * 100) : 0, dash = (pct / 100 * 188.5).toFixed(1);
    const fut = futureInstallments(s, sel.id, key), futTot = fut.reduce((n, p) => n + p.total, 0);
    const payName = s.accounts.find(a => a.id === sel.payAcc)?.name;
    const chips = `<div style="display:flex;gap:8px;overflow-x:auto">${s.cards.map(c => `<button class="chip ${c.id === sel.id ? 'on' : ''}" data-act="cardSel" data-id="${c.id}" style="white-space:nowrap">${esc(c.name)}</button>`).join('')}</div>`;
    const ring = lim ? `<div style="position:relative;width:76px;height:76px"><svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="9"/><circle cx="38" cy="38" r="30" fill="none" stroke="#7FE0B5" stroke-width="9" stroke-linecap="round" stroke-dasharray="${dash} 188.5" transform="rotate(-90 38 38)"/></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><b style="font-size:16px;line-height:18px">${Math.round(pct)}%</b><span style="font-size:10px;color:#A7B6C4">limite</span></div></div>` : '';
    const box = (l, v) => `<div style="flex:1;background:rgba(255,255,255,.08);border-radius:14px;padding:10px 12px"><div style="font-size:12px;color:#A7B6C4">${l}</div><b style="font-size:15px">${v}</b></div>`;
    const best = `${String(bestPurchaseDay(sel)).padStart(2, '0')}`;
    const payBtn = !future && inv.restante > 0 ? `<button class="pri" data-act="payInv" data-id="${sel.id}">Pagar fatura · ${money(inv.restante)}</button>` : !future && inv.status === 'paga' ? '<div class="card" style="padding:14px 16px;font-size:14px;color:#0F6B47;font-weight:600">Fatura paga. O limite já voltou.</div>' : '';
    const catBox = byCat.length ? `<div class="card" style="padding:14px 16px 8px"><b style="font-size:16px">Fatura por categoria</b>${byCat.map(([k, v]) => `<div style="min-height:48px;display:flex;flex-direction:column;justify-content:center;gap:6px;margin-top:6px"><div style="display:flex;justify-content:space-between;font-size:14px"><b>${esc(k)}</b><span>${money(v)} · ${pct0(v / tot * 100)}%</span></div>${track(Math.min(100, v / tot * 100), '#2B4EFF')}</div>`).join('')}</div>` : `<div class="card" style="padding:14px 16px;font-size:14px;color:#4A5A68">Sem compras nesta fatura.</div>`;
    const pend = fut.length ? `<div class="card" style="padding:14px 16px 6px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:16px">Parcelas futuras</b><b style="font-size:14px">${hm(ctx, futTot)}</b></div><div style="font-size:12px;color:#4A5A68;margin-top:2px">Já comprometido no limite, além desta fatura.</div>${fut.map(p => `<div class="row" style="min-height:60px"><div style="display:flex;flex-direction:column"><b style="font-size:15px">${esc(p.desc)}</b><span style="font-size:12px;color:#4A5A68">Próxima: parcela ${p.next} de ${p.t} · faltam ${p.count} · termina em ${mname(p.endKey)}</span></div><b style="font-size:15px">${money(p.value)}</b></div>`).join('')}</div>` : '<div class="card" style="padding:14px 16px;font-size:14px;color:#4A5A68">Sem parcelas futuras neste cartão.</div>';
    return `<div style="padding:20px 20px 4px;display:flex;align-items:center;justify-content:space-between"><div><h1>Cartões</h1><div class="sub" style="margin-top:6px">Fatura de ${mname(key)}</div></div>${plus}</div>
    <div class="pad" style="gap:12px;padding-top:8px">${chips}${monthStrip(ctx)}
      <div class="dark" style="display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:18px;font-weight:600">Cartão ${esc(sel.name)}</div><div style="font-size:13px;color:#A7B6C4">Fecha em ${fmtDate(inv.closeDate)} · vence em ${fmtDate(inv.dueDate)}</div>${payName ? `<div style="font-size:13px;color:#A7B6C4">Paga com ${esc(payName)}</div>` : ''}</div><span style="font-size:13px;font-weight:700;color:#0F1B26;background:${stCol};border-radius:12px;padding:4px 10px">${status}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:13px;color:#A7B6C4">${isNow ? 'A pagar' : 'Fatura'}</div><div class="big" style="font-size:34px;line-height:42px">${money(value)}</div>${note ? `<div style="font-size:12px;color:#A7B6C4">${note}</div>` : ''}</div>${ring}</div>
        <div style="display:flex;gap:10px">${lim ? box('Limite disponível', hm(ctx, Math.max(0, lim - used))) : ''}${box('Melhor dia de compra', 'dia ' + best)}</div>
        ${lim ? `<div style="font-size:12px;color:#A7B6C4">Limite usado = fatura aberta + parcelas futuras: ${hm(ctx, used)} de ${hm(ctx, lim)}.</div>` : ''}
      </div>
      ${payBtn}${catBox}${pend}
      <div>${lab('<span>Compras da fatura</span>')}<div class="card" style="padding:0 14px">${inv.items.map(t => txRow(s, t)).join('') || empty('Nenhuma compra nesta fatura.')}</div></div>
      <button class="chip" data-act="cardEdit" data-id="${sel.id}">Editar cartão</button>
    </div>`;
  },
};

const cardFields = (ctx, c) => [{ id: 'name', label: 'Nome', value: c?.name ?? '' }, { id: 'limit', label: 'Limite', type: 'money', value: c?.limit ? br(c.limit) : '' }, { id: 'closeDay', label: 'Dia de fechamento (1 a 28)', type: 'number', value: c?.closeDay ?? 2 }, { id: 'dueDay', label: 'Dia de vencimento (1 a 28)', type: 'number', value: c?.dueDay ?? 9 }, { id: 'payAcc', label: 'Conta que paga a fatura', type: 'select', value: c?.payAcc, options: ctx.s.accounts.map(a => [a.id, a.name]) }];
const NOTE = '<div style="font-size:13px;color:#4A5A68">O melhor dia de compra é o dia seguinte ao fechamento.</div>';
export const sheets = {
  cardNew: ctx => formSheet('Novo cartão', cardFields(ctx), 'cardSave', 'Criar cartão', NOTE),
  cardEdit: (ctx, d) => formSheet('Editar cartão', cardFields(ctx, ctx.s.cards.find(c => c.id === d.id)), 'cardSave', 'Salvar', NOTE),
  payInv: (ctx, d) => {
    const c = ctx.s.cards.find(x => x.id === d.id), inv = invoiceFor(ctx.s, d.id, ctx.ui.month, ctx.today);
    return formSheet('Pagar fatura ' + c.name, [{ id: 'v', label: 'Valor', type: 'money', value: br(inv.restante) }, { id: 'acc', label: 'Sai da conta', type: 'select', value: c.payAcc, options: ctx.s.accounts.map(a => [a.id, a.name]) }], 'payInvSave', 'Pagar',
      `<div style="font-size:14px;color:#4A5A68">A pagar: <b>${money(inv.restante)}</b>, vence em ${fmtDate(inv.dueDate)}. Pagar a fatura é uma transferência: não vira uma nova despesa, porque as compras já foram contadas no dia em que você comprou. Pode pagar em parte.</div>`);
  },
};

export const acts = {
  cardSel(ctx, d) { ctx.ui.cardSel = Number(d.id); ctx.render(); },
  cardNew(ctx) { ctx.openSheet('cardNew'); },
  cardEdit(ctx, d) { ctx.openSheet('cardEdit', { id: Number(d.id) }); },
  cardSave(ctx, d, root) {
    const v = readForm(root, ['name', 'limit', 'closeDay', 'dueDay', 'payAcc'].map(id => ({ id }))), cd = Number(v.closeDay), dd = Number(v.dueDay);
    const f = { name: v.name, limit: parseMoney(v.limit || '') || null, closeDay: cd, dueDay: dd, payAcc: Number(v.payAcc) || null }, edit = ctx.ui.sheet?.k === 'cardEdit';
    const next = edit ? editCard(ctx.s, ctx.ui.sheet.d.id, f) : (() => { if (!f.name.trim()) throw new Error('Dê um nome para o cartão.'); if (!(cd >= 1 && cd <= 28 && dd >= 1 && dd <= 28)) throw new Error('Os dias vão de 1 a 28.'); return addCard(ctx.s, { ...f, name: f.name.trim() }); })();
    ctx.ui.sheet = null; ctx.set(next);
  },
  payInv(ctx, d) { ctx.openSheet('payInv', { id: Number(d.id) }); },
  payInvSave(ctx, d, root) {
    const v = readForm(root, [{ id: 'v' }, { id: 'acc' }]), id = ctx.ui.sheet.d.id;
    const next = payInvoice(ctx.s, id, ctx.ui.month, Number(v.acc), ctx.today, parseMoney(v.v || ''));
    ctx.ui.sheet = null; ctx.set(next); ctx.toast('Pagamento lançado.');
  },
};
