import { ico, esc, money, head, lab, monthStrip, monthLabel, formSheet, readForm, sw, empty, GCOL, pct0, MONTHS } from './components.js';
import { planRows, groupState, copyPlan, setCatGroup, saveLeftover, leftoverRoom } from '../core/plan.js';
import { parseMoney } from '../core/money.js';
import { listEditable } from '../core/categories.js';
import { addMonths } from '../core/dates.js';
import { nextId } from '../core/ledger.js';
import { txRow } from './txrow.js';

const STATE = { excedeu: ['#FFE3E8', '#A11D3A'], perto: ['#FFF1CC', '#7A5200'], ok: ['#DDF6EA', '#0F6B47'] };
const stateTxt = r => { const k = groupState(r); return k === 'excedeu' ? 'Excedeu ' + money(-r.diff) : k === 'perto' ? 'Perto do limite · restam ' + money(r.diff) : 'Restam ' + money(r.diff); };

export function grpBody(r, col, arrow) {
  const k = groupState(r), [bg, fg] = STATE[k], wp = r.limit > 0 ? Math.min(100, r.pago / r.limit * 100) : r.used > 0 ? 100 : 0, wv = r.limit > 0 ? Math.max(0, Math.min(100 - wp, r.prev / r.limit * 100)) : 0;
  const pc = k === 'excedeu' ? '#A11D3A' : k === 'perto' ? '#7A5200' : '#0F1B26';
  return `<div style="display:flex;align-items:center;gap:12px"><span style="width:40px;height:40px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px;flex:none">${esc((r.group.n || '?').trim().charAt(0).toUpperCase())}</span>
    <span style="display:flex;flex-direction:column;min-width:0;flex:1"><b style="font-size:16px;line-height:20px">${esc(r.group.n)}</b><span style="font-size:12px;color:#4A5A68">${r.group.p}% da renda · limite ${money(r.limit)}</span></span>${arrow ? ico('chev', '#9AA7B3', 18) : ''}</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px"><span style="display:flex;flex-direction:column"><span style="font-size:12px;color:#4A5A68">Gasto + previsto</span><b class="big" style="font-size:26px;line-height:30px">${money(r.used)}</b></span><b class="big" style="font-size:24px;color:${pc}">${pct0(r.pct)}%</b></div>
    <div style="display:flex;height:14px;border-radius:7px;background:#E7EBEF;overflow:hidden"><div style="width:${wp}%;background:${col}"></div><div style="width:${wv}%;background:${col}55"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#4A5A68"><span>Pago ${money(r.pago)}</span><span>Previsto ${money(r.prev)}</span></div>
    <div style="background:${bg};color:${fg};font-size:13px;font-weight:700;border-radius:12px;padding:8px 12px;text-align:center">${stateTxt(r)}</div>`;
}

export const screens = {
  plano(ctx) {
    const { s, ui } = ctx, key = ui.month, pr = planRows(s, key), top = `${head('Plano', monthLabel(key))}${monthStrip(ctx)}`;
    if (!pr) {
      const srcs = Object.keys(s.plans).sort((a, b) => (a === addMonths(key, -1) ? -1 : b === addMonths(key, -1) ? 1 : 0));
      return `${top}<div class="pad"><div class="card" style="padding:18px 16px;display:flex;flex-direction:column;gap:6px"><b style="font-size:17px">Sem plano em ${MONTHS[Number(key.slice(5)) - 1]}</b><span style="font-size:14px;color:#4A5A68">Cada mês tem o seu plano. Copie de outro mês e ajuste, ou crie do zero.</span></div>${srcs.map(k => `<button class="pri" data-act="planCopy" data-from="${k}">Copiar de ${MONTHS[Number(k.slice(5)) - 1]}${k === addMonths(key, -1) ? ' (mês anterior)' : ''}</button>`).join('')}<button class="sec" data-act="planNew">Criar plano do zero</button></div>`;
    }
    const p = s.plans[key], pago = pr.rows.reduce((n, r) => n + r.pago, 0), prev = pr.rows.reduce((n, r) => n + r.prev, 0), rw = pr.renda > 0 ? 100 / pr.renda : 0;
    const sum = pr.sum === 100 ? '' : `<div style="background:${pr.sum > 100 ? '#FFE3E8' : '#FFF1CC'};border-radius:16px;padding:10px 14px;font-size:13px">Os grupos somam <b>${pr.sum}%</b>: ${pr.sum > 100 ? 'planejou gastar mais do que a renda.' : `${100 - pr.sum}% da renda está sem destino.`}</div>`;
    const semGrupo = listEditable(s, 'e').filter(c => !p.catGrp[c.name]).length;
    return `${top}<div class="pad"><div class="dark" style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-size:13px;color:#A7B6C4">Renda base do mês · ${p.auto ? 'soma das receitas' : 'valor digitado'}</div><div class="big" style="font-size:28px;line-height:34px">${money(pr.renda)}</div></div><button class="btn link" data-act="planEdit" style="color:#7FE0B5">Editar plano</button></div>
      <div style="display:flex;height:12px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden"><div style="width:${Math.min(100, pago * rw)}%;background:#7FE0B5"></div><div style="width:${Math.max(0, Math.min(100 - pago * rw, prev * rw))}%;background:#3E7F68"></div></div><div style="display:flex;justify-content:space-between;font-size:13px;color:#A7B6C4"><span>Pago ${money(pago)}</span><span>Previsto ${money(prev)}</span></div></div>
      ${sum}<div style="display:flex;flex-direction:column;gap:10px">${pr.rows.map((r, i) => `<button data-act="openGrp" data-id="${r.group.id}" class="card" style="width:100%;text-align:left;cursor:pointer;font:inherit;color:inherit;padding:14px 16px;display:flex;flex-direction:column;gap:10px;border:${r.pct > 100 ? '1.5px solid #F0A3B2' : '1px solid #DCE1E7'}">${grpBody(r, GCOL[i % GCOL.length], true)}</button>`).join('') || `<div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhum grupo. Toque em Editar plano.</div>`}</div>
      <div style="background:#fff;border:1px solid #DCE1E7;border-radius:16px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center"><div style="display:flex;flex-direction:column"><b style="font-size:14px">Fora dos grupos</b><span style="font-size:12px;color:#4A5A68">Pago, mas sem grupo de planejamento</span></div><b style="font-size:15px">${money(pr.fora)}</b></div>
      <button class="card" data-act="catGrpOpen" style="display:flex;justify-content:space-between;align-items:center;text-align:left;cursor:pointer;font:inherit;min-height:60px"><span style="display:flex;flex-direction:column"><b style="font-size:15px">Categorias por grupo</b><span style="font-size:12px;color:#4A5A68">${semGrupo ? semGrupo + ' sem grupo (contam em Fora dos grupos)' : 'Todas as categorias têm grupo'}</span></span>${ico('chev', '#9AA7B3', 18)}</button>
      <div class="card" style="padding:12px 16px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div style="display:flex;flex-direction:column"><b style="font-size:15px">Aviso de limite</b><span style="font-size:12px;color:#4A5A68">Aparece no Início quando um grupo chega ao limite</span></div>${sw('alertTog', s.prefs.alertOn, 'Aviso de limite')}</div>
        ${s.prefs.alertOn ? `<div style="display:flex;gap:8px"><button class="chip ${s.prefs.alertThr === 90 ? 'on' : ''}" data-act="alertThr" data-v="90">Ao chegar em 90%</button><button class="chip ${s.prefs.alertThr === 100 ? 'on' : ''}" data-act="alertThr" data-v="100">Ao passar de 100%</button></div>${s.prefs.alertHide.length ? '<button class="btn link" data-act="alertReset" style="justify-content:flex-start;padding:0">Mostrar de novo os avisos dispensados</button>' : ''}` : ''}</div></div>`;
  },
  grupo(ctx) {
    const { s, ui } = ctx, key = ui.month, pr = planRows(s, key), i = pr?.rows.findIndex(r => r.group.id === ui.params.id) ?? -1;
    if (i < 0) return `${head('Grupo', '', 'plano')}<div class="pad"><div class="card" style="padding:16px">Grupo não encontrado.</div></div>`;
    const r = pr.rows[i], p = s.plans[key], cats = Object.keys(p.catGrp).filter(c => p.catGrp[c] === r.group.id);
    const txs = s.tx.filter(t => t.type === 'e' && t.date.startsWith(key) && cats.includes(t.cat)).sort((a, b) => b.date.localeCompare(a.date));
    const room = key === ctx.today.slice(0, 7) ? leftoverRoom(s, key, r.group.id) : 0;
    return `${head(esc(r.group.n), monthLabel(key), 'plano')}<div class="pad"><div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">${grpBody(r, GCOL[i % GCOL.length], false)}</div>
      ${room > 0 && s.accounts.length ? `<button class="pri" data-act="sobraOpen" data-id="${r.group.id}">Guardar sobra · ${money(room)}</button>` : ''}
      <div>${lab('<span>Categorias deste grupo</span>')}<div class="card" style="padding:12px 16px;font-size:14px">${cats.map(esc).join(', ') || 'Nenhuma categoria neste grupo.'}</div></div>
      <div>${lab('<span>Lançamentos do grupo</span>')}<div class="card" style="padding:0 14px">${txs.map(t => txRow(s, t)).join('') || empty('Nenhum lançamento.')}</div></div></div>`;
  },
};

const sobraDest = s => s.accounts.flatMap(a => [...a.subs.map(x => [`sub|${a.id}|${x.id}`, `${a.name} › ${x.name}`]), [`acc|${a.id}`, `${a.name} (conta inteira)`]]);
export const sheets = {
  sobra(ctx, d) {
    const room = leftoverRoom(ctx.s, ctx.ui.month, d.id);
    return formSheet('Guardar sobra', [{ id: 'value', label: 'Valor', type: 'money', value: (room / 100).toFixed(2).replace('.', ',') }, { id: 'from', label: 'Sai do Livre de', type: 'select', options: ctx.s.accounts.map(a => [a.id, a.name]) }, { id: 'dest', label: 'Guardar em', type: 'select', options: sobraDest(ctx.s) }], 'sobraSave', 'Guardar',
      `<div style="font-size:13px;color:#4A5A68">É uma transferência, não uma despesa. Dá para guardar até ${money(room)}; o que guardar sai do disponível do grupo. Para desfazer, exclua a transferência no extrato.</div>`);
  },
  planEdit(ctx) {
    const key = ctx.ui.month, p = ctx.s.plans[key];
    return `<div class="sheetbg"><div class="sheet" role="dialog" aria-label="Editar plano"><h2>Editar plano</h2>
      <div class="nrow"><span style="flex:1">Renda = receitas do mês</span>${sw('planAuto', p.auto, 'Renda automática')}</div>
      ${p.auto ? '' : `<label>Renda base<input id="f_renda" inputmode="decimal" value="${(p.renda / 100).toFixed(2).replace('.', ',')}"></label>`}
      ${p.groups.map((g, i) => `<div style="display:flex;gap:8px;align-items:flex-end"><label style="flex:1">Grupo<input id="f_gn${i}" value="${esc(g.n)}"></label><label style="width:90px">%<input id="f_gp${i}" type="number" data-input="planSum" value="${g.p}"></label><button class="btn" data-act="grpDel" data-id="${g.id}" aria-label="Excluir ${esc(g.n)}">${ico('close', '#A11D3A', 20)}</button></div>`).join('')}
      <div id="planSum" style="font-size:13px;color:#4A5A6A">Soma ${p.groups.reduce((n, g) => n + g.p, 0)}%</div><button class="sec" data-act="grpAdd">+ Novo grupo</button><button class="pri" data-act="planSave">Salvar</button><button class="sec" data-act="sheetClose">Cancelar</button></div></div>`;
  },
  catGrp(ctx) {
    const key = ctx.ui.month, p = ctx.s.plans[key];
    return `<div class="sheetbg"><div class="sheet" role="dialog" aria-label="Categorias por grupo"><h2>Categorias por grupo</h2>${listEditable(ctx.s, 'e').map(c => `<label>${esc(c.name)}<select id="f_cg_${c.id}"><option value="">Sem grupo</option>${p.groups.map(g => `<option value="${g.id}" ${p.catGrp[c.name] === g.id ? 'selected' : ''}>${esc(g.n)}</option>`).join('')}</select></label>`).join('') || '<div style="font-size:14px">Nenhuma categoria de despesa.</div>'}<button class="pri" data-act="catGrpSave">Salvar</button><button class="sec" data-act="sheetClose">Cancelar</button></div></div>`;
  },
};

export const acts = {
  sobraOpen(ctx, d) { ctx.openSheet('sobra', { id: d.id }); },
  sobraSave(ctx, d, root) {
    const v = readForm(root, ['value', 'from', 'dest'].map(id => ({ id }))), c = parseMoney(v.value), [k, a, b] = v.dest.split('|');
    if (!c || c <= 0) throw new Error('Informe um valor maior que zero.');
    const from = Number(v.from), to = Number(a);
    if (k === 'acc' && to === from) throw new Error('Escolha uma subconta ou outra conta como destino.');
    const next = saveLeftover(ctx.s, ctx.ui.month, ctx.ui.sheet.d.id, from, k === 'sub' ? Number(b) : undefined, c, to);
    ctx.ui.sheet = null; ctx.set(next); ctx.toast('Sobra guardada.');
  },
  planCopy(ctx, d) { ctx.set(copyPlan(ctx.s, d.from, ctx.ui.month)); },
  planNew(ctx) { const r = structuredClone(ctx.s); r.plans[ctx.ui.month] = { auto: false, renda: 0, groups: [], catGrp: {} }; ctx.set(r); },
  openGrp(ctx, d) { ctx.go('grupo', { id: d.id }); },
  planEdit(ctx) { ctx.openSheet('planEdit'); },
  planAuto(ctx, d, root) { const r = structuredClone(ctx.s); r.plans[ctx.ui.month].auto = !r.plans[ctx.ui.month].auto; ctx.set(r); ctx.openSheet('planEdit'); },
  grpAdd(ctx) { const r = structuredClone(ctx.s); r.plans[ctx.ui.month].groups.push({ id: 'g' + nextId(r), n: 'Novo grupo', p: 0 }); ctx.set(r); ctx.openSheet('planEdit'); },
  grpDel(ctx, d) {
    const r = structuredClone(ctx.s), p = r.plans[ctx.ui.month];
    p.groups = p.groups.filter(g => g.id !== d.id); for (const c of Object.keys(p.catGrp)) if (p.catGrp[c] === d.id) delete p.catGrp[c];
    ctx.set(r); ctx.openSheet('planEdit');
  },
  planSum(ctx, d, root) {
    const n = [...root.querySelectorAll('[id^=f_gp]')].reduce((t, e) => t + (Number(e.value) || 0), 0);
    root.querySelector('#planSum').textContent = 'Soma ' + n + '%';
  },
  planSave(ctx, d, root) {
    const r = structuredClone(ctx.s), p = r.plans[ctx.ui.month];
    if (!p.auto) { const v = parseMoney(root.querySelector('#f_renda').value); if (v === null) throw new Error('Informe a renda base.'); p.renda = v; }
    p.groups.forEach((g, i) => { g.n = root.querySelector('#f_gn' + i).value.trim() || g.n; g.p = Number(root.querySelector('#f_gp' + i).value) || 0; });
    ctx.ui.sheet = null; ctx.set(r);
  },
  catGrpOpen(ctx) { ctx.openSheet('catGrp'); },
  catGrpSave(ctx, d, root) {
    let r = ctx.s; for (const c of listEditable(r, 'e')) r = setCatGroup(r, ctx.ui.month, c.name, root.querySelector('#f_cg_' + c.id).value);
    ctx.ui.sheet = null; ctx.set(r);
  },
  alertTog(ctx) { const r = structuredClone(ctx.s); r.prefs.alertOn = !r.prefs.alertOn; ctx.set(r); },
  alertThr(ctx, d) { const r = structuredClone(ctx.s); r.prefs.alertThr = Number(d.v); ctx.set(r); },
  alertReset(ctx) { const r = structuredClone(ctx.s); r.prefs.alertHide = []; ctx.set(r); },
};
