import { ico, esc, money, hm, lab, head, field, readForm, monthStrip, empty, monthLabel, MONTHS } from './components.js';
import { monthSummary, addTx, editTx, delTx, effectTx } from '../core/ledger.js';
import { addInstallments } from '../core/cards.js';
import { parseMoney } from '../core/money.js';
import { listOptions } from '../core/categories.js';
import { fmtDate } from '../core/dates.js';
import { txRow, accName } from './txrow.js';

const KINDS = [['geral', 'Geral'], ['contas', 'Contas'], ['cartao', 'Cartão'], ['assin', 'Assinaturas']];
const kindOf = (t, k) => (k === 'geral' ? true : k === 'contas' ? !t.card : k === 'cartao' ? !!t.card : t.cat === 'Assinaturas');
const TYPES = [['e', 'Despesa', '#C2253F'], ['r', 'Receita', '#0F6B47'], ['t', 'Transferência', '#6B3FC9'], ['c', 'Cartão', '#0C8A8A']];

export const screens = {
  lanc(ctx) {
    const { s, ui } = ctx, key = ui.month, kind = ui.kind || 'geral';
    const all = s.tx.filter(t => t.date.startsWith(key) && t.type !== 'a');
    const list = all.filter(t => kindOf(t, kind)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const m = monthSummary(s, key), only = kind !== 'geral';
    const rec = list.filter(t => t.type === 'r' && t.status === 'p').reduce((n, t) => n + t.value, 0);
    const exp = list.filter(t => t.type === 'e' && t.status === 'p').reduce((n, t) => n + t.value, 0);
    const pend = list.filter(t => t.status !== 'p'), paid = list.filter(t => t.status === 'p');
    const group = l => { const by = {}; l.forEach(t => (by[t.date] ||= []).push(t)); return Object.entries(by).map(([d, ts]) => `<div>${lab(`<span>${fmtDate(d)}</span>`)}<div class="card" style="padding:0 14px">${ts.map(t => txRow(s, t)).join('')}</div></div>`).join(''); };
    return `${head('Lançamentos', monthLabel(key))}${monthStrip(ctx)}<div class="pad">
      <div class="dark" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between"><div><div style="font-size:13px;color:#A7B6C4">Receitas pagas</div><b class="big" style="font-size:20px;color:#7FE0B5">${money(m.receitas)}</b></div><div style="text-align:right"><div style="font-size:13px;color:#A7B6C4">Despesas pagas</div><b class="big" style="font-size:20px;color:#FF8FA8">${money(m.despesas)}</b></div></div>
        <div style="font-size:13px;color:#A7B6C4">Resultado <b style="color:#fff">${m.resultado >= 0 ? '+ ' : '− '}${money(Math.abs(m.resultado))}</b> · a receber ${money(m.aReceber)} · a pagar ${money(m.aPagar)} · ${m.pendentes} pendente${m.pendentes === 1 ? '' : 's'}</div></div>
      <div style="display:flex;gap:8px;overflow-x:auto">${KINDS.map(([k, l]) => `<button class="chip ${kind === k ? 'on' : ''}" data-act="kind" data-k="${k}">${l}</button>`).join('')}</div>
      <div style="background:#fff;border:1px solid #DCE1E7;border-radius:16px;padding:10px 16px;display:flex;justify-content:space-between;font-size:14px"><b>Total do filtro</b>${only ? `<b style="color:#C2253F">Total gasto ${money(exp)} · ${list.length}</b>` : `<span><b style="color:#0F6B47">${money(rec)}</b> · <b style="color:#C2253F">${money(exp)}</b> · <b>${rec - exp < 0 ? '− ' : ''}${money(Math.abs(rec - exp))}</b></span>`}</div>
      ${pend.length ? `<div>${lab('<span>Pendentes</span>')}<div style="background:#fff;border:1.5px dashed #9AA7B3;border-radius:18px;padding:0 14px">${pend.map(t => txRow(s, t)).join('')}</div></div>` : ''}
      ${group(paid) || (pend.length ? '' : `<div class="card">${empty('Nenhum lançamento neste mês.')}</div>`)}</div>
      <button class="fab" data-act="novo" aria-label="Novo lançamento">${ico('plus', '#fff', 26, 2.4)}</button>`;
  },
};

function novoFields(ctx, d) {
  const { s } = ctx, t = d.type;
  const accs = s.accounts.map(a => [a.id, a.name]), cats = listOptions(s, t === 'r' ? 'r' : 'e').map(c => [c.name, c.name]);
  const f = [{ id: 'value', label: 'Valor', type: 'money', value: d.value, placeholder: '0,00' }, { id: 'desc', label: 'Descrição', value: d.desc }];
  if (t === 't') f.push({ id: 'from', label: 'De', type: 'select', value: d.from, options: accs }, { id: 'to', label: 'Para', type: 'select', value: d.to, options: accs });
  else {
    f.push({ id: 'cat', label: 'Categoria', type: 'select', value: d.cat, options: cats.length ? cats : [['Outros', 'Outros']] });
    if (t === 'c') f.push({ id: 'card', label: 'Cartão', type: 'select', value: d.card, options: s.cards.map(c => [c.id, c.name]) }, { id: 'parc', label: 'Parcelas', type: 'number', value: d.parc || 1 });
    else f.push({ id: 'acc', label: 'Conta', type: 'select', value: d.acc, options: accs, change: 'novoRefresh' }, { id: 'sub', label: 'Subconta', type: 'select', value: d.sub, options: [['', 'Livre'], ...(s.accounts.find(a => a.id === Number(d.acc || accs[0]?.[0]))?.subs || []).map(x => [x.id, x.name])] });
  }
  f.push({ id: 'date', label: 'Data', type: 'date', value: d.date || ctx.today });
  if (t !== 'c') f.push({ id: 'status', label: 'Situação', type: 'select', value: d.status || 'p', options: [['p', t === 'r' ? 'Recebido' : 'Pago'], ['n', 'Pendente']] });
  return f;
}

export const sheets = {
  novo(ctx, d) {
    const [, , col] = TYPES.find(x => x[0] === d.type), fields = novoFields(ctx, d);
    return `<div class="sheetbg"><div class="sheet" role="dialog" aria-label="Novo lançamento"><h2>Novo lançamento</h2>
      <div class="seg" style="flex-wrap:wrap">${TYPES.map(([k, l, c]) => `<button class="chip ${k === d.type ? 'on' : ''}" data-act="novoType" data-t="${k}" style="${k === d.type ? `background:${c};border-color:${c}` : ''}">${l}</button>`).join('')}</div>
      ${fields.map(field).join('')}<button class="pri" data-act="novoSave" style="background:${col}">Salvar</button><button class="sec" data-act="sheetClose">Cancelar</button></div></div>`;
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
  kind(ctx, d) { ctx.ui.kind = d.k; ctx.render(); },
  novo(ctx) { ctx.openSheet('novo', { type: 'e' }); },
  novoType(ctx, d, root) {
    const old = ctx.ui.sheet.d, cur = Object.fromEntries([...root.querySelectorAll('[id^=f_]')].map(e => [e.id.slice(2), e.value]));
    ctx.openSheet('novo', { ...cur, type: d.t });
  },
  novoRefresh(ctx, d, root) { acts.novoType(ctx, { t: ctx.ui.sheet.d.type }, root); },
  novoSave(ctx, d, root) {
    const type = ctx.ui.sheet.d.type, ids = [...root.querySelectorAll('[id^=f_]')].map(e => e.id.slice(2)), v = readForm(root, ids.map(id => ({ id })));
    const value = parseMoney(v.value);
    if (!value || value <= 0) throw new Error('Informe um valor maior que zero.');
    const base = { value, desc: v.desc || v.cat || (type === 'r' ? 'Receita' : 'Despesa'), date: v.date || ctx.today };
    let next;
    if (type === 't') {
      if (v.from === v.to) throw new Error('Escolha contas diferentes.');
      next = addTx(ctx.s, { ...base, type: 't', status: v.status || 'p', from: Number(v.from), to: Number(v.to), cat: 'Transferência' });
    } else if (type === 'c') {
      if (!v.card) throw new Error('Cadastre um cartão primeiro.');
      const tx = { ...base, type: 'e', status: 'p', cat: v.cat, card: Number(v.card) }, n = Number(v.parc) || 1;
      next = n > 1 ? addInstallments(ctx.s, tx, n) : addTx(ctx.s, tx);
    } else {
      if (!v.acc) throw new Error('Cadastre uma conta primeiro.');
      next = addTx(ctx.s, { ...base, type, status: v.status || 'p', cat: v.cat, acc: Number(v.acc), ...(v.sub ? { sub: Number(v.sub) } : {}) });
    }
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
