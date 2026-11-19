import { ico, esc, money, head, lab, monthStrip, monthLabel, formSheet, readForm, track, pct0, empty } from './components.js';
import { addCard, invoiceFor, payInvoice } from '../core/cards.js';
import { parseMoney } from '../core/money.js';
import { fmtDate } from '../core/dates.js';
import { txRow } from './txrow.js';

const STATUS = { aberta: ['Aberta', '#DDF6EA', '#0F6B47'], fechada: ['Fechada', '#FFF1CC', '#7A5200'], paga: ['Paga', '#E7EBEF', '#4A5A68'] };

export const screens = {
  cartoes(ctx) {
    const { s, ui } = ctx, sel = s.cards.find(c => c.id === ui.cardSel) || s.cards[0];
    const chips = `<div style="display:flex;gap:8px;overflow-x:auto;padding:0 16px 8px">${s.cards.map(c => `<button class="chip ${sel && c.id === sel.id ? 'on' : ''}" data-act="cardSel" data-id="${c.id}">${esc(c.name)}</button>`).join('')}<button class="chip" data-act="cardNew" aria-label="Novo cartão">+</button></div>`;
    if (!sel) return `${head('Cartões', 'Faturas e limite')}<div class="pad"><div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhum cartão ainda.</div><button class="pri" data-act="cardNew">+ Novo cartão</button></div>`;
    const inv = invoiceFor(s, sel.id, ui.month, ctx.today), [lbl, bg, fg] = STATUS[inv.status];
    const byCat = Object.entries(inv.items.reduce((m, t) => ((m[t.cat] = (m[t.cat] || 0) + t.value), m), {})).sort((a, b) => b[1] - a[1]);
    return `${head('Cartões', 'Faturas e limite')}${chips}${monthStrip(ctx)}<div class="pad">
      <div class="dark" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">${esc(sel.name)}</b><span style="background:${bg};color:${fg};font-size:12px;font-weight:700;border-radius:12px;padding:4px 10px">${lbl}</span></div>
        <div class="big" style="font-size:30px">${money(inv.total)}</div>
        <div style="font-size:13px;color:#A7B6C4">Fecha em ${fmtDate(inv.closeDate)} · vence em ${fmtDate(inv.dueDate)} · melhor dia de compra: ${sel.closeDay + 1}</div>
        ${sel.limit ? `<div style="font-size:12px;color:#A7B6C4">Limite ${money(sel.limit)} · fatura usa ${pct0(inv.total / sel.limit * 100)}%</div>` : ''}
        ${inv.restante > 0 ? `<button class="btn link" data-act="payInv" data-id="${sel.id}" style="color:#7FE0B5;justify-content:flex-start">Pagar fatura</button>` : ''}</div>
      ${byCat.length ? `<div class="card" style="padding:4px 16px">${byCat.map(([c, v]) => `<div class="grp" style="padding:10px 0"><div style="display:flex;justify-content:space-between;font-size:14px"><b>${esc(c)}</b><span>${money(v)} · ${pct0(v / inv.total * 100)}%</span></div></div>`).join('')}</div>` : ''}
      <div>${lab('<span>Compras da fatura</span>')}<div class="card" style="padding:0 14px">${inv.items.map(t => txRow(s, t)).join('') || empty('Nenhuma compra nesta fatura.')}</div></div></div>`;
  },
};

export const sheets = {
  cardNew: ctx => formSheet('Novo cartão', [{ id: 'name', label: 'Nome' }, { id: 'limit', label: 'Limite (opcional)', type: 'money' }, { id: 'closeDay', label: 'Dia de fechamento', type: 'number', value: 2 }, { id: 'dueDay', label: 'Dia de vencimento', type: 'number', value: 9 }, { id: 'payAcc', label: 'Conta que paga a fatura', type: 'select', options: ctx.s.accounts.map(a => [a.id, a.name]) }], 'cardSave', 'Criar cartão'),
  payInv: (ctx, d) => formSheet('Pagar fatura', [{ id: 'acc', label: 'Pagar com a conta', type: 'select', value: ctx.s.cards.find(c => c.id === d.id)?.payAcc, options: ctx.s.accounts.map(a => [a.id, a.name]) }], 'payInvSave', 'Pagar'),
};

export const acts = {
  cardSel(ctx, d) { ctx.ui.cardSel = Number(d.id); ctx.render(); },
  cardNew(ctx) { ctx.openSheet('cardNew'); },
  cardSave(ctx, d, root) {
    const v = readForm(root, ['name', 'limit', 'closeDay', 'dueDay', 'payAcc'].map(id => ({ id }))), cd = Number(v.closeDay), dd = Number(v.dueDay);
    if (!v.name.trim()) throw new Error('Dê um nome para o cartão.');
    if (!(cd >= 1 && cd <= 28 && dd >= 1 && dd <= 28)) throw new Error('Os dias vão de 1 a 28.');
    ctx.ui.sheet = null; ctx.set(addCard(ctx.s, { name: v.name.trim(), limit: parseMoney(v.limit || '') || null, closeDay: cd, dueDay: dd, payAcc: Number(v.payAcc) || null }));
  },
  payInv(ctx, d) { ctx.openSheet('payInv', { id: Number(d.id) }); },
  payInvSave(ctx, d, root) {
    const acc = Number(readForm(root, [{ id: 'acc' }]).acc), id = ctx.ui.sheet.d.id;
    ctx.ui.sheet = null; ctx.set(payInvoice(ctx.s, id, ctx.ui.month, acc, ctx.today)); ctx.toast('Fatura paga.');
  },
};
