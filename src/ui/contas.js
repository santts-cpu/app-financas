import { ico, esc, hm, money, head, lab, splitBar, readForm, formSheet, monthStrip, GCOL, pct0, MONTHS } from './components.js';
import { txRow } from './txrow.js';
import { fmtDate } from '../core/dates.js';
import { accountView, addAccount, addSub, editSub, delSub, transferBetweenSubs, adjustBalance, setSubValue, moveAccount, accountStatement } from '../core/ledger.js';
import { parseMoney } from '../core/money.js';

const COLORS = [['#2B4EFF', 'Azul'], ['#D12F4B', 'Vermelho'], ['#E0A100', 'Amarelo'], ['#2FA97A', 'Verde'], ['#8A5CE0', 'Roxo'], ['#E07A3A', 'Laranja'], ['#3FA7C7', 'Ciano'], ['#B24FB5', 'Rosa']];
const subCol = (a, id, i) => a.subs.find(x => x.id === id)?.color || GCOL[(i + 1) % GCOL.length];
const br = c => (c / 100).toFixed(2).replace('.', ',');

function accCard(ctx, a, i = 0, n = 1, reorder = false) {
  const v = accountView(ctx.s, a.id), tot = Math.max(1, v.total);
  const parts = [...v.subs.map((x, i) => ({ v: Math.max(0, x.value), col: subCol(a, x.id, i), n: x.name, id: x.id, val: x.value })), { v: Math.max(0, v.livre), col: '#7FE0B5', n: 'Livre', val: v.livre }];
  return `<div class="dark" style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;align-items:center;gap:12px"><span style="width:40px;height:40px;border-radius:50%;background:#2B4EFF;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px">${esc(a.name.charAt(0).toUpperCase())}</span><button class="btn" data-act="openAcc" data-acc="${a.id}" aria-label="Abrir extrato de ${esc(a.name)}" style="flex:1;justify-content:flex-start;text-align:left;font:inherit;color:#fff;gap:6px"><b style="font-size:16px">${esc(a.name)}</b>${ico('chev', '#A7B6C4', 16, 2.4)}</button>${reorder ? `<button class="btn" data-act="accUp" data-acc="${a.id}" aria-label="Subir ${esc(a.name)}" ${i === 0 ? 'disabled style="opacity:.3"' : ''}>${ico('up', '#fff', 22)}</button><button class="btn" data-act="accDown" data-acc="${a.id}" aria-label="Descer ${esc(a.name)}" ${i === n - 1 ? 'disabled style="opacity:.3"' : ''}>${ico('down', '#fff', 22)}</button>` : ''}</div>
    <div class="big" style="font-size:30px;line-height:34px">${hm(ctx, v.total)}</div>
    ${splitBar(parts)}
    <div style="display:flex;flex-direction:column">${parts.map(p => `<div style="display:flex;align-items:center;gap:10px;min-height:44px;border-top:1px solid rgba(255,255,255,.12)"><span style="width:12px;height:12px;border-radius:4px;background:${p.col}"></span><span style="flex:1;font-size:15px">${esc(p.n)}</span><span style="text-align:right;font-size:15px">${hm(ctx, p.val)} <span style="font-size:12px;color:#A7B6C4">${pct0(p.val / tot * 100)}%</span></span>${p.id ? `<button class="btn" data-act="subEdit" data-acc="${a.id}" data-id="${p.id}" aria-label="Editar ${esc(p.n)}" style="color:#AEBBFF">${ico('pencil', '#AEBBFF', 18)}</button>` : ''}</div>`).join('')}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn link" data-act="subNew" data-acc="${a.id}" style="color:#AEBBFF">+ Subconta</button><button class="btn link" data-act="subMove" data-acc="${a.id}" style="color:#AEBBFF">Transferir</button><button class="btn link" data-act="adjust" data-acc="${a.id}" style="color:#AEBBFF">Ajustar saldo</button></div></div>`;
}

const chip = (on, act, attrs, label) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" ${attrs} style="white-space:nowrap">${label}</button>`;

export const screens = {
  contas(ctx) {
    const n = ctx.s.accounts.length, re = ctx.ui.reorder;
    return `${head('Contas', 'Contas correntes e subcontas')}<div class="pad">${ctx.s.accounts.map((a, i) => accCard(ctx, a, i, n, re)).join('') || '<div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhuma conta ainda.</div>'}<button class="sec" data-act="accNew">+ Nova conta</button>${n > 1 ? `<button class="sec" data-act="accReorder">${re ? 'Pronto' : 'Reordenar contas'}</button>` : ''}</div>`;
  },
  conta(ctx) {
    const { s, ui } = ctx, a = s.accounts.find(x => x.id === ui.params.acc);
    if (!a) return `${head('Conta', '', 'contas')}<div class="pad"><div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Conta não encontrada.</div></div>`;
    const f = ui.accSub ?? 'all', key = ui.month, v = accountView(s, a.id), tot = Math.max(1, v.total);
    const parts = [...v.subs.map((x, i) => ({ v: Math.max(0, x.value), col: subCol(a, x.id, i), n: x.name })), { v: Math.max(0, v.livre), col: '#7FE0B5', n: 'Livre' }];
    const list = accountStatement(s, a.id, key, f === 'all' ? undefined : f);
    const moves = (a.moves || []).filter(m => m.date.startsWith(key)).sort((x, y) => y.date.localeCompare(x.date) || y.id - x.id);
    const mname = MONTHS[Number(key.slice(5, 7)) - 1].toLowerCase();
    const chips = `<div style="display:flex;gap:8px;overflow-x:auto">${chip(f === 'all', 'accSubF', 'data-id="all"', 'Todas')}${chip(f === 'livre', 'accSubF', 'data-id="livre"', 'Livre')}${a.subs.map(x => chip(f === x.id, 'accSubF', `data-id="${x.id}"`, esc(x.name))).join('')}</div>`;
    const movBox = f === 'all' && moves.length ? `<div>${lab(`<span>Movimentações entre subcontas · ${moves.length}</span>`, '<span style="font-weight:500;font-size:12px">não mudam o saldo</span>')}<div class="card" style="padding:0 14px">${moves.map(m => `<div class="row" style="min-height:56px"><div style="display:flex;flex-direction:column"><b style="font-size:15px">${esc(m.fromName)} → ${esc(m.toName)}</b><span style="font-size:12px;color:#4A5A68">${fmtDate(m.date)}</span></div><b>${money(m.value)}</b></div>`).join('')}</div></div>` : '';
    return `<div style="padding:20px 8px 8px;display:flex;align-items:center;gap:4px"><button class="btn" data-act="go" data-to="contas" aria-label="Voltar">${ico('back', '#0F1B26')}</button><h1 style="font-size:26px;line-height:32px">${esc(a.name)}</h1></div>
    <div class="pad" style="gap:12px;padding-top:4px">
      <div class="dark" style="display:flex;flex-direction:column;gap:12px"><div style="font-size:13px;color:#A7B6C4">Saldo da conta</div><div class="big" style="font-size:32px;line-height:36px">${hm(ctx, v.total)}</div>${splitBar(parts)}
        <div style="display:flex;flex-wrap:wrap;gap:6px 14px">${parts.map(p => `<span style="font-size:13px;display:flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:${p.col}"></i>${esc(p.n)} ${pct0(p.v / tot * 100)}%</span>`).join('')}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn link" data-act="subNew" data-acc="${a.id}" style="color:#AEBBFF">+ Subconta</button><button class="btn link" data-act="subMove" data-acc="${a.id}" style="color:#AEBBFF">Transferir</button><button class="btn link" data-act="adjust" data-acc="${a.id}" style="color:#AEBBFF">Ajustar saldo</button></div></div>
      ${chips}${monthStrip(ctx)}
      <div style="font-size:13px;color:#4A5A68">Extrato de ${mname}${f === 'all' ? '' : ' · ' + esc(f === 'livre' ? 'Livre' : a.subs.find(x => x.id === f)?.name || '')}</div>
      <div class="card" style="padding:0 14px">${list.map(t => txRow(s, t)).join('') || '<div style="padding:16px 0;font-size:14px;color:#4A5A68">Nenhum lançamento neste mês.</div>'}</div>
      ${movBox}
    </div>`;
  },
};

const accOpts = a => [['livre', 'Livre'], ...a.subs.map(x => [x.id, x.name])];
export const sheets = {
  accNew: () => formSheet('Nova conta', [{ id: 'name', label: 'Nome' }, { id: 'initial', label: 'Saldo inicial', type: 'money', placeholder: '0,00' }], 'accSave', 'Criar conta'),
  subForm(ctx, d) {
    return formSheet(d.id ? 'Editar subconta' : 'Nova subconta', [{ id: 'name', label: 'Nome', value: d.name }, { id: 'value', label: 'Valor reservado', type: 'money', value: d.value }, { id: 'color', label: 'Cor', type: 'select', value: d.color || COLORS[0][0], options: COLORS }], 'subSave', 'Salvar', d.id ? `<button class="sec" data-act="subDel" style="color:#A11D3A">Excluir subconta</button>` : '');
  },
  subDelAsk: (ctx, d) => `<div class="sheet-body" style="padding:20px;display:flex;flex-direction:column;gap:12px"><h2 style="font-size:20px">Excluir a subconta ${esc(d.name)}?</h2><div style="font-size:14px;color:#4A5A68">O valor reservado volta para o Livre da conta e os lançamentos dela passam para o Livre. O saldo total não muda.</div><button class="pri" data-act="subDelOk" style="background:#C2253F">Excluir subconta</button><button class="sec" data-act="sheetClose">Cancelar</button></div>`,
  subMove(ctx, d) {
    const a = ctx.s.accounts.find(x => x.id === d.acc);
    return formSheet('Transferir entre subcontas', [{ id: 'from', label: 'De', type: 'select', options: accOpts(a) }, { id: 'to', label: 'Para', type: 'select', value: a.subs[0]?.id, options: accOpts(a) }, { id: 'value', label: 'Valor', type: 'money' }], 'subMoveSave', 'Transferir');
  },
  adjust(ctx, d) {
    return formSheet('Ajustar saldo', [{ id: 'real', label: 'Saldo real da conta', type: 'money', value: (accountView(ctx.s, d.acc).total / 100).toFixed(2).replace('.', ',') }], 'adjustSave', 'Ajustar');
  },
};

export const acts = {
  openAcc(ctx, d) { ctx.ui.accSub = 'all'; ctx.go('conta', { acc: Number(d.acc) }); },
  accSubF(ctx, d) { ctx.ui.accSub = d.id === 'all' || d.id === 'livre' ? d.id : Number(d.id); ctx.render(); },
  accReorder(ctx) { ctx.ui.reorder = !ctx.ui.reorder; ctx.render(); },
  accUp(ctx, d) { ctx.set(moveAccount(ctx.s, Number(d.acc), -1)); },
  accDown(ctx, d) { ctx.set(moveAccount(ctx.s, Number(d.acc), 1)); },
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
    ctx.openSheet('subForm', { acc: a.id, id: x.id, name: x.name, color: x.color, value: (shown / 100).toFixed(2).replace('.', ',') });
  },
  subSave(ctx, d, root) {
    const sh = ctx.ui.sheet.d, v = readForm(root, [{ id: 'name' }, { id: 'value' }, { id: 'color' }]), value = parseMoney(v.value || '0');
    if (!v.name.trim() || value === null) throw new Error('Informe nome e valor.');
    ctx.ui.sheet = null; ctx.set(sh.id ? editSub(setSubValue(ctx.s, sh.acc, sh.id, value), sh.acc, sh.id, { name: v.name.trim(), color: v.color }) : addSub(ctx.s, sh.acc, { name: v.name.trim(), value, color: v.color }));
  },
  subDel(ctx) { const sh = ctx.ui.sheet.d; ctx.openSheet('subDelAsk', sh); },
  subDelOk(ctx) { const sh = ctx.ui.sheet.d; ctx.ui.sheet = null; ctx.set(delSub(ctx.s, sh.acc, sh.id)); ctx.toast('Subconta excluída.'); },
  subMove(ctx, d) { ctx.openSheet('subMove', { acc: Number(d.acc) }); },
  subMoveSave(ctx, d, root) {
    const acc = ctx.ui.sheet.d.acc, v = readForm(root, [{ id: 'from' }, { id: 'to' }, { id: 'value' }]), value = parseMoney(v.value);
    if (!value || value <= 0) throw new Error('Informe um valor maior que zero.');
    if (v.from === v.to) throw new Error('Escolha subcontas diferentes.');
    const p = x => (x === 'livre' ? 'livre' : Number(x));
    const next = transferBetweenSubs(ctx.s, acc, p(v.from), p(v.to), value, ctx.today);
    ctx.ui.sheet = null; ctx.set(next);
    if (accountView(next, acc).livre < 0) ctx.toast('Atenção: o Livre ficou negativo.');
  },
  adjust(ctx, d) { ctx.openSheet('adjust', { acc: Number(d.acc) }); },
  adjustSave(ctx, d, root) {
    const real = parseMoney(readForm(root, [{ id: 'real' }]).real);
    if (real === null) throw new Error('Informe o saldo real.');
    const acc = ctx.ui.sheet.d.acc; ctx.ui.sheet = null; ctx.set(adjustBalance(ctx.s, acc, real));
  },
};
