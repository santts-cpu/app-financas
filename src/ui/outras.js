import { ico, esc, money, hm, head, lab, track, strip, boxed, splitBar, formSheet, readForm, empty, GCOL, pct0, monthLabel } from './components.js';
import { addGoal, goalInfo, contribute, completeGoal } from '../core/goals.js';
import { addAssin, setAssinStatus, assinTotal, nextCharges } from '../core/subs.js';
import { addCat, renameCat, archiveCat, deleteCat, listEditable, catMonthSpend } from '../core/categories.js';
import { addAsset, linkAccount, capItems, capByClass, capByLoc, capTotals, setClassMetas } from '../core/capital.js';
import { accountView } from '../core/ledger.js';
import { parseMoney } from '../core/money.js';
import { fmtDate } from '../core/dates.js';
import { accName, cardName } from './txrow.js';

const amt = c => (c / 100).toFixed(2).replace('.', ',');
const destOpts = s => s.accounts.flatMap(a => [[`acc|${a.id}`, `${a.name} (conta inteira)`], [`livre|${a.id}`, `${a.name} · Livre`], ...a.subs.map(x => [`sub|${a.id}|${x.id}`, `${a.name} › ${x.name}`])]);
const parseDest = v => { const [k, a, b] = v.split('|'); return k === 'acc' ? { kind: 'acc', id: Number(a) } : k === 'livre' ? { kind: 'livre', acc: Number(a) } : { kind: 'sub', acc: Number(a), id: Number(b) }; };
const PALETTE = [['#2B4EFF', 'Azul'], ['#D12F4B', 'Vermelho'], ['#E0A100', 'Âmbar'], ['#2FA97A', 'Verde'], ['#8A5CE0', 'Roxo'], ['#E07A3A', 'Laranja']];

export const screens = {
  metas(ctx) {
    const { s } = ctx, act = s.metas.filter(m => !m.done), done = s.metas.filter(m => m.done);
    const card = m => { const i = goalInfo(s, m, ctx.today); return `<button class="card" data-act="metaOpen" data-id="${m.id}" style="text-align:left;cursor:pointer;font:inherit;color:inherit;padding:14px 16px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between"><b style="font-size:16px">${esc(m.name)}</b><b>${pct0(i.pct)}%</b></div>${track(i.pct, m.color, 10)}<div style="font-size:13px;color:#4A5A68">${i.removed ? 'Destino removido' : `${hm(ctx, i.saved)} de ${money(m.target)}`}${i.perMonth ? ` · guarde ${money(i.perMonth)} por mês até ${m.deadline.slice(5)}/${m.deadline.slice(0, 4)}` : ''}</div></button>`; };
    return `${head('Metas', 'Quanto falta para cada objetivo')}<div class="pad">${act.map(card).join('') || '<div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhuma meta ativa.</div>'}<button class="sec" data-act="metaNew">+ Nova meta</button>${done.length ? `<div>${lab('<span>Concluídas</span>')}<div style="display:flex;flex-direction:column;gap:10px">${done.map(card).join('')}</div></div>` : ''}</div>`;
  },
  assin(ctx) {
    const { s } = ctx, t = assinTotal(s), pr = s.assin.slice().sort((a, b) => a.day - b.day);
    const row = a => `<button class="row btn" data-act="assinOpen" data-id="${a.id}" style="width:100%;text-align:left;min-height:62px;justify-content:space-between;padding:0;opacity:${a.status === 'ativa' ? 1 : .6}"><span style="display:flex;flex-direction:column"><b style="font-size:15px">${esc(a.name)}</b><span style="font-size:12px;color:#4A5A68">dia ${a.day} · ${a.from.kind === 'card' ? 'Cartão ' + esc(cardName(s, a.from.id)) : esc(accName(s, a.from.id))}${a.status !== 'ativa' ? ' · ' + a.status : ''}</span></span><b>${money(a.value)}</b></button>`;
    return `${head('Assinaturas', 'Tudo que se repete todo mês')}<div class="pad"><div class="dark"><div style="font-size:13px;color:#A7B6C4">Por mês</div><div class="big" style="font-size:30px">${money(t.month)}</div><div style="font-size:13px;color:#A7B6C4">${money(t.year)} por ano</div></div><div class="card" style="padding:0 16px">${pr.map(row).join('') || empty('Nenhuma assinatura.')}</div><button class="sec" data-act="assinNew">+ Nova assinatura</button></div>`;
  },
  categ(ctx) {
    const { s, ui } = ctx, tp = ui.catTab || 'e', key = ui.month;
    return `${head('Categorias', monthLabel(key))}<div class="pad"><div class="seg"><button class="chip ${tp === 'e' ? 'on' : ''}" data-act="catTab" data-t="e">Despesa</button><button class="chip ${tp === 'r' ? 'on' : ''}" data-act="catTab" data-t="r">Receita</button></div>
      <div class="card" style="padding:0 16px">${listEditable(s, tp).map(c => { const g = Object.values(s.plans[key]?.catGrp || {}).length ? (s.plans[key].groups.find(x => x.id === s.plans[key].catGrp[c.name])?.n || 'Sem grupo') : ''; return `<button class="row btn" data-act="catOpen" data-n="${esc(c.name)}" style="width:100%;text-align:left;min-height:62px;justify-content:space-between;padding:0;opacity:${c.arch ? .5 : 1}"><span style="display:flex;align-items:center;gap:12px"><span style="width:14px;height:14px;border-radius:5px;background:${c.color}"></span><span style="display:flex;flex-direction:column"><b style="font-size:15px">${esc(c.name)}${c.arch ? ' (arquivada)' : ''}</b>${tp === 'e' && g ? `<span style="font-size:12px;color:#4A5A68">Grupo no Plano: ${esc(g)}</span>` : ''}</span></span><b>${money(catMonthSpend(s, c.name, key))}</b></button>`; }).join('') || empty('Nenhuma categoria.')}</div><button class="sec" data-act="catNew">+ Nova categoria</button></div>`;
  },
  capital(ctx) {
    const { s, ui } = ctx, tab = ui.capTab || 'loc', tot = capTotals(s);
    const itemRow = i => `<div class="grp" style="display:flex;align-items:center;gap:10px;min-height:48px"><span style="flex:1;font-size:15px">${esc(i.name)}${i.linked ? ' ' + ico('link', '#9AA7B3', 14) : ''}<span style="display:block;font-size:12px;color:#4A5A68">${esc(i.cls)}</span></span><b>${hm(ctx, i.value)}</b><button class="btn" data-act="capDel" data-id="${i.id}" aria-label="Remover ${esc(i.name)}">${ico('close', '#9AA7B3', 18)}</button></div>`;
    const body = tab === 'loc'
      ? capByLoc(s).map(l => `<div class="card" style="padding:12px 16px"><div style="display:flex;justify-content:space-between"><b style="font-size:16px">${esc(l.loc)}</b><b>${hm(ctx, l.value)}</b></div><div style="font-size:12px;color:#4A5A68">${pct0(l.pct)}% do capital</div>${l.items.map(itemRow).join('')}</div>`).join('') || '<div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhum ativo ainda.</div>'
      : `<div class="card" style="padding:4px 16px">${capByClass(s).map(c => `<div class="grp" style="padding:12px 0"><div style="display:flex;justify-content:space-between"><b style="font-size:15px">${esc(c.cls)}${c.fora ? ' (fora das metas)' : ''}</b><b>${hm(ctx, c.value)}</b></div>${c.fora ? '' : `<div style="font-size:12px;color:#4A5A68;margin:4px 0 6px">${pct0(c.pct)}% · meta ${c.meta}% · ${c.desvioPts >= 0 ? '+' : '−'}${Math.abs(c.desvioPts).toFixed(1).replace('.', ',')} pts (${c.desvioCents >= 0 ? 'sobra' : 'falta'} ${money(Math.abs(c.desvioCents))})</div>${track(c.pct, '#2B4EFF')}`}</div>`).join('')}</div><button class="sec" data-act="capMeta">Definir metas de %</button>`;
    return `${head('Capital', 'Onde o dinheiro está')}<div class="pad"><div class="dark"><div style="font-size:13px;color:#A7B6C4">Capital total</div><div class="big" style="font-size:30px">${hm(ctx, tot.total)}</div><div style="font-size:13px;color:#A7B6C4">Investimentos ${hm(ctx, tot.investimentos)} · Reserva ${hm(ctx, tot.reserva)}</div></div>
      <div class="seg"><button class="chip ${tab === 'loc' ? 'on' : ''}" data-act="capTab" data-t="loc">Por local</button><button class="chip ${tab === 'cls' ? 'on' : ''}" data-act="capTab" data-t="cls">Por classe</button></div>${body}<div style="display:flex;gap:8px"><button class="sec" style="flex:1" data-act="capNew">+ Ativo</button><button class="sec" style="flex:1" data-act="capLink">Ligar conta</button></div></div>`;
  },
};

export const sheets = {
  metaNew: ctx => formSheet('Nova meta', [{ id: 'name', label: 'Nome' }, { id: 'target', label: 'Valor alvo', type: 'money' }, { id: 'dest', label: 'Destino', type: 'select', options: destOpts(ctx.s) }, { id: 'deadline', label: 'Prazo (opcional)', type: 'month' }, { id: 'color', label: 'Cor', type: 'select', options: PALETTE.map(([c, n]) => [c, n]) }], 'metaSave', 'Criar meta'),
  meta(ctx, d) {
    const m = ctx.s.metas.find(x => x.id === d.id);
    return formSheet(m.name, [{ id: 'value', label: 'Guardar na meta', type: 'money' }, { id: 'from', label: 'Tirar do Livre de', type: 'select', options: ctx.s.accounts.map(a => [a.id, a.name]) }], 'metaContrib', 'Guardar', `${m.done ? '' : '<button class="sec" data-act="metaDone">Marcar como concluída</button>'}`);
  },
  assinForm: (ctx, d) => formSheet(d.id ? 'Editar assinatura' : 'Nova assinatura', [{ id: 'name', label: 'Nome', value: d.name }, { id: 'value', label: 'Valor', type: 'money', value: d.value }, { id: 'day', label: 'Dia da cobrança (1 a 28)', type: 'number', value: d.day || 5 }, { id: 'from', label: 'Cobrada em', type: 'select', value: d.from, options: [...ctx.s.accounts.map(a => [`acc|${a.id}`, a.name]), ...ctx.s.cards.map(c => [`card|${c.id}`, 'Cartão ' + c.name])] }], 'assinSave', 'Salvar', d.id ? `<div class="seg"><button class="sec" data-act="assinSt" data-v="ativa">Ativar</button><button class="sec" data-act="assinSt" data-v="pausada">Pausar</button><button class="sec" data-act="assinSt" data-v="cancelada">Cancelar</button></div>` : ''),
  catNew: () => formSheet('Nova categoria', [{ id: 'name', label: 'Nome' }, { id: 'color', label: 'Cor', type: 'select', options: PALETTE }], 'catSave', 'Criar'),
  cat(ctx, d) {
    const others = ctx.s.cats.filter(c => c.type === d.type && c.name !== d.name && !c.system).map(c => [c.name, c.name]);
    return formSheet(d.name, [{ id: 'name', label: 'Nome', value: d.name }], 'catRename', 'Renomear', `<button class="sec" data-act="catArch">Arquivar</button>${others.length ? `<label>Excluir e mover lançamentos para<select id="f_dest"><option value="">Escolher categoria…</option>${others.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></label>` : ''}<button class="sec" data-act="catDel" style="color:#A11D3A">Excluir</button>`);
  },
  capNew: () => formSheet('Novo ativo', [{ id: 'name', label: 'Nome' }, { id: 'cls', label: 'Classe', value: 'Renda fixa' }, { id: 'loc', label: 'Local (corretora ou banco)' }, { id: 'value', label: 'Valor atual', type: 'money' }], 'capSave', 'Salvar'),
  capLink: ctx => formSheet('Ligar conta ao Capital', [{ id: 'ref', label: 'Conta', type: 'select', options: destOpts(ctx.s) }], 'capLinkSave', 'Ligar'),
  capMeta: ctx => formSheet('Metas de % por classe', ctx.s.cap.classes.filter(c => !c.fora).map(c => ({ id: 'm_' + c.n.replace(/\W/g, '_'), label: c.n, type: 'number', value: c.meta })), 'capMetaSave', 'Salvar'),
};

export const acts = {
  metaNew(ctx) { ctx.openSheet('metaNew'); },
  metaSave(ctx, d, root) {
    const v = readForm(root, ['name', 'target', 'dest', 'deadline', 'color'].map(id => ({ id }))), target = parseMoney(v.target);
    if (!v.name.trim() || !target) throw new Error('Informe nome e valor alvo.');
    ctx.ui.sheet = null; ctx.set(addGoal(ctx.s, { name: v.name.trim(), target, dest: parseDest(v.dest), deadline: v.deadline || null, color: v.color }));
  },
  metaOpen(ctx, d) { ctx.openSheet('meta', { id: Number(d.id) }); },
  metaContrib(ctx, d, root) {
    const v = readForm(root, [{ id: 'value' }, { id: 'from' }]), c = parseMoney(v.value);
    if (!c || c <= 0) throw new Error('Informe um valor maior que zero.');
    const id = ctx.ui.sheet.d.id; ctx.ui.sheet = null; ctx.set(contribute(ctx.s, id, c, Number(v.from), ctx.today));
  },
  metaDone(ctx) { const id = ctx.ui.sheet.d.id; ctx.ui.sheet = null; ctx.set(completeGoal(ctx.s, id)); },
  assinNew(ctx) { ctx.openSheet('assinForm', {}); },
  assinOpen(ctx, d) { const a = ctx.s.assin.find(x => x.id === Number(d.id)); ctx.openSheet('assinForm', { id: a.id, name: a.name, value: amt(a.value), day: a.day, from: `${a.from.kind}|${a.from.id}` }); },
  assinSave(ctx, d, root) {
    const v = readForm(root, ['name', 'value', 'day', 'from'].map(id => ({ id }))), value = parseMoney(v.value), [k, id] = v.from.split('|');
    if (!v.name.trim() || !value) throw new Error('Informe nome e valor.');
    const sh = ctx.ui.sheet.d; let r = ctx.s;
    if (sh.id) { r = structuredClone(r); Object.assign(r.assin.find(a => a.id === sh.id), { name: v.name.trim(), value, day: Number(v.day), from: { kind: k, id: Number(id) } }); if (!(r.assin.find(a => a.id === sh.id).day >= 1 && r.assin.find(a => a.id === sh.id).day <= 28)) throw new Error('O dia da cobrança vai de 1 a 28.'); }
    else r = addAssin(r, { name: v.name.trim(), value, day: Number(v.day), from: { kind: k, id: Number(id) } });
    ctx.ui.sheet = null; ctx.set(r);
  },
  assinSt(ctx, d) { const id = ctx.ui.sheet.d.id; ctx.ui.sheet = null; ctx.set(setAssinStatus(ctx.s, id, d.v)); },
  catTab(ctx, d) { ctx.ui.catTab = d.t; ctx.render(); },
  catNew(ctx) { ctx.openSheet('catNew'); },
  catSave(ctx, d, root) { const v = readForm(root, [{ id: 'name' }, { id: 'color' }]); if (!v.name.trim()) throw new Error('Dê um nome.'); ctx.ui.sheet = null; ctx.set(addCat(ctx.s, { name: v.name.trim(), type: ctx.ui.catTab || 'e', color: v.color })); },
  catOpen(ctx, d) { ctx.openSheet('cat', { name: d.n, type: ctx.ui.catTab || 'e' }); },
  catRename(ctx, d, root) { const n = readForm(root, [{ id: 'name' }]).name.trim(), old = ctx.ui.sheet.d.name; if (!n) throw new Error('Dê um nome.'); ctx.ui.sheet = null; ctx.set(n === old ? ctx.s : renameCat(ctx.s, old, n)); },
  catArch(ctx) { const n = ctx.ui.sheet.d.name; ctx.ui.sheet = null; ctx.set(archiveCat(ctx.s, n)); },
  catDel(ctx, d, root) { const n = ctx.ui.sheet.d.name, dest = root.querySelector('#f_dest')?.value; const r = deleteCat(ctx.s, n, dest); ctx.ui.sheet = null; ctx.set(r); },
  capTab(ctx, d) { ctx.ui.capTab = d.t; ctx.render(); },
  capNew(ctx) { ctx.openSheet('capNew'); },
  capSave(ctx, d, root) {
    const v = readForm(root, ['name', 'cls', 'loc', 'value'].map(id => ({ id }))), value = parseMoney(v.value);
    if (!v.name.trim() || value === null || !v.loc.trim()) throw new Error('Informe nome, local e valor.');
    ctx.ui.sheet = null; ctx.set(addAsset(ctx.s, { name: v.name.trim(), cls: v.cls.trim() || 'Outros', loc: v.loc.trim(), value }));
  },
  capLink(ctx) { if (!ctx.s.accounts.length) throw new Error('Cadastre uma conta primeiro.'); ctx.openSheet('capLink'); },
  capLinkSave(ctx, d, root) { const ref = parseDest(readForm(root, [{ id: 'ref' }]).ref); ctx.ui.sheet = null; ctx.set(linkAccount(ctx.s, ref)); },
  capDel(ctx, d) { const r = structuredClone(ctx.s); r.cap.items = r.cap.items.filter(i => i.id !== Number(d.id)); ctx.set(r); },
  capMeta(ctx) { ctx.openSheet('capMeta'); },
  capMetaSave(ctx, d, root) {
    const map = {}; for (const c of ctx.s.cap.classes.filter(x => !x.fora)) map[c.n] = Number(root.querySelector('#f_m_' + c.n.replace(/\W/g, '_')).value) || 0;
    const r = setClassMetas(ctx.s, map); ctx.ui.sheet = null; ctx.set(r);
  },
};
