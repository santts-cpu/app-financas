import { ico, esc, hm, money, head, lab, splitBar, field, readForm, formSheet, GCOL, pct0 } from './components.js';
import { accountView, addAccount, addSub, editSub, delSub, transferBetweenSubs, adjustBalance, setSubValue } from '../core/ledger.js';
import { parseMoney } from '../core/money.js';

function accCard(ctx, a) {
  const v = accountView(ctx.s, a.id), tot = Math.max(1, v.total);
  const parts = [...v.subs.map((x, i) => ({ v: Math.max(0, x.value), col: GCOL[(i + 1) % GCOL.length], n: x.name, id: x.id, val: x.value })), { v: Math.max(0, v.livre), col: '#7FE0B5', n: 'Livre', val: v.livre }];
  return `<div class="dark" style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;align-items:center;gap:12px"><span style="width:40px;height:40px;border-radius:50%;background:#2B4EFF;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px">${esc(a.name.charAt(0).toUpperCase())}</span><div style="flex:1"><b style="font-size:16px">${esc(a.name)}</b></div></div>
    <div class="big" style="font-size:30px;line-height:34px">${hm(ctx, v.total)}</div>
    ${splitBar(parts)}
    <div style="display:flex;flex-direction:column">${parts.map(p => `<div style="display:flex;align-items:center;gap:10px;min-height:44px;border-top:1px solid rgba(255,255,255,.12)"><span style="width:12px;height:12px;border-radius:4px;background:${p.col}"></span><span style="flex:1;font-size:15px">${esc(p.n)}</span><span style="text-align:right;font-size:15px">${hm(ctx, p.val)} <span style="font-size:12px;color:#A7B6C4">${pct0(p.val / tot * 100)}%</span></span>${p.id ? `<button class="btn" data-act="subEdit" data-acc="${a.id}" data-id="${p.id}" aria-label="Editar ${esc(p.n)}" style="color:#AEBBFF">${ico('pencil', '#AEBBFF', 18)}</button>` : ''}</div>`).join('')}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn link" data-act="subNew" data-acc="${a.id}" style="color:#AEBBFF">+ Subconta</button><button class="btn link" data-act="subMove" data-acc="${a.id}" style="color:#AEBBFF">Transferir</button><button class="btn link" data-act="adjust" data-acc="${a.id}" style="color:#AEBBFF">Ajustar saldo</button></div></div>`;
}

export const screens = {
  contas(ctx) {
    return `${head('Contas', 'Contas correntes e subcontas')}<div class="pad">${ctx.s.accounts.map(a => accCard(ctx, a)).join('') || '<div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhuma conta ainda.</div>'}<button class="sec" data-act="accNew">+ Nova conta</button></div>`;
  },
};

const accOpts = a => [['livre', 'Livre'], ...a.subs.map(x => [x.id, x.name])];
export const sheets = {
  accNew: () => formSheet('Nova conta', [{ id: 'name', label: 'Nome' }, { id: 'initial', label: 'Saldo inicial', type: 'money', placeholder: '0,00' }], 'accSave', 'Criar conta'),
  subForm(ctx, d) {
    return formSheet(d.id ? 'Editar subconta' : 'Nova subconta', [{ id: 'name', label: 'Nome', value: d.name }, { id: 'value', label: 'Valor', type: 'money', value: d.value }], 'subSave', 'Salvar', d.id ? `<button class="sec" data-act="subDel" style="color:#A11D3A">Excluir subconta</button>` : '');
  },
  subMove(ctx, d) {
    const a = ctx.s.accounts.find(x => x.id === d.acc);
    return formSheet('Transferir entre subcontas', [{ id: 'from', label: 'De', type: 'select', options: accOpts(a) }, { id: 'to', label: 'Para', type: 'select', value: a.subs[0]?.id, options: accOpts(a) }, { id: 'value', label: 'Valor', type: 'money' }], 'subMoveSave', 'Transferir');
  },
  adjust(ctx, d) {
    return formSheet('Ajustar saldo', [{ id: 'real', label: 'Saldo real da conta', type: 'money', value: (accountView(ctx.s, d.acc).total / 100).toFixed(2).replace('.', ',') }], 'adjustSave', 'Ajustar');
  },
};

export const acts = {
  accNew(ctx) { ctx.openSheet('accNew'); },
  accSave(ctx, d, root) {
    const v = readForm(root, [{ id: 'name' }, { id: 'initial' }]);
    if (!v.name.trim()) throw new Error('Dê um nome para a conta.');
    ctx.ui.sheet = null; ctx.set(addAccount(ctx.s, { name: v.name.trim(), initial: parseMoney(v.initial || '0') ?? 0 }));
  },
  subNew(ctx, d) { ctx.openSheet('subForm', { acc: Number(d.acc) }); },
  subEdit(ctx, d) {
    const a = ctx.s.accounts.find(x => x.id === Number(d.acc)), x = a.subs.find(y => y.id === Number(d.id));
    const shown = accountView(ctx.s, a.id).subs.find(y => y.id === x.id).value;
    ctx.openSheet('subForm', { acc: a.id, id: x.id, name: x.name, value: (shown / 100).toFixed(2).replace('.', ',') });
  },
  subSave(ctx, d, root) {
    const sh = ctx.ui.sheet.d, v = readForm(root, [{ id: 'name' }, { id: 'value' }]), value = parseMoney(v.value || '0');
    if (!v.name.trim() || value === null) throw new Error('Informe nome e valor.');
    ctx.ui.sheet = null; ctx.set(sh.id ? editSub(setSubValue(ctx.s, sh.acc, sh.id, value), sh.acc, sh.id, { name: v.name.trim() }) : addSub(ctx.s, sh.acc, { name: v.name.trim(), value }));
  },
  subDel(ctx) { const sh = ctx.ui.sheet.d; ctx.ui.sheet = null; ctx.set(delSub(ctx.s, sh.acc, sh.id)); },
  subMove(ctx, d) { ctx.openSheet('subMove', { acc: Number(d.acc) }); },
  subMoveSave(ctx, d, root) {
    const acc = ctx.ui.sheet.d.acc, v = readForm(root, [{ id: 'from' }, { id: 'to' }, { id: 'value' }]), value = parseMoney(v.value);
    if (!value || value <= 0) throw new Error('Informe um valor maior que zero.');
    if (v.from === v.to) throw new Error('Escolha subcontas diferentes.');
    const p = x => (x === 'livre' ? 'livre' : Number(x));
    const next = transferBetweenSubs(ctx.s, acc, p(v.from), p(v.to), value);
    ctx.ui.sheet = null; ctx.set(next);
  },
  adjust(ctx, d) { ctx.openSheet('adjust', { acc: Number(d.acc) }); },
  adjustSave(ctx, d, root) {
    const real = parseMoney(readForm(root, [{ id: 'real' }]).real);
    if (real === null) throw new Error('Informe o saldo real.');
    const acc = ctx.ui.sheet.d.acc; ctx.ui.sheet = null; ctx.set(adjustBalance(ctx.s, acc, real));
  },
};
