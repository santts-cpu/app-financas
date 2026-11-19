import { ico, esc, money, hm, head, lab, track, strip, boxed, splitBar, formSheet, readForm, empty, GCOL, pct0, monthLabel } from './components.js';
import { addGoal, addGoalNewSub, editGoal, deleteGoal, moveGoal, reopenGoal, goalHistory, goalsTotals, goalInfo, contribute, completeGoal } from '../core/goals.js';
import { startAssin, editAssin, deleteAssin, assinSummary, sortAssin, fixedRepeats, stopRepeat, setAssinStatus } from '../core/subs.js';
import { addCat, renameCat, archiveCat, unarchiveCat, editCat, deleteCat, listEditable, catMonthSpend } from '../core/categories.js';
import { addAsset, editAsset, removeAsset, setItemClass, ASSET_TYPES, linkAccount, capItems, capByClass, capByLoc, capTotals, setClassMetas } from '../core/capital.js';
import { accountView } from '../core/ledger.js';
import { parseMoney } from '../core/money.js';
import { fmtDate } from '../core/dates.js';
import { accName, cardName, txRow } from './txrow.js';

const amt = c => (c / 100).toFixed(2).replace('.', ',');
const destOpts = s => s.accounts.flatMap(a => [[`acc|${a.id}`, `${a.name} (conta inteira)`], [`livre|${a.id}`, `${a.name} · Livre`], ...a.subs.map(x => [`sub|${a.id}|${x.id}`, `${a.name} › ${x.name}`])]);
const parseDest = v => { const [k, a, b] = v.split('|'); return k === 'acc' ? { kind: 'acc', id: Number(a) } : k === 'livre' ? { kind: 'livre', acc: Number(a) } : { kind: 'sub', acc: Number(a), id: Number(b) }; };
const PALETTE = [['#2B4EFF', 'Azul'], ['#D12F4B', 'Vermelho'], ['#E0A100', 'Âmbar'], ['#2FA97A', 'Verde'], ['#8A5CE0', 'Roxo'], ['#E07A3A', 'Laranja']];

export const screens = {
  metas(ctx) {
    const { s, ui } = ctx, act = s.metas.filter(m => !m.done), done = s.metas.filter(m => m.done), re = ui.reorder, tt = goalsTotals(s, ctx.today);
    const prazo = (m, i) => (m.deadline && !i.removed ? (i.late ? `<span style="color:#A11D3A;font-weight:700">${i.pct >= 100 ? '' : (m.deadline < ctx.today.slice(0, 7) ? 'Prazo vencido' : 'Vence neste mês')} · ${m.deadline.slice(5)}/${m.deadline.slice(0, 4)}</span>` : `prazo ${m.deadline.slice(5)}/${m.deadline.slice(0, 4)}`) : '');
    const card = (m, idx, n) => { const i = goalInfo(s, m, ctx.today), pz = prazo(m, i); return `<div style="display:flex;align-items:stretch;gap:6px"><button class="card" data-act="metaOpen" data-id="${m.id}" style="flex:1;text-align:left;cursor:pointer;font:inherit;color:inherit;padding:14px 16px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between"><b style="font-size:16px">${esc(m.name)}</b><b>${pct0(i.pct)}%</b></div>${track(i.pct, m.color, 10)}<div style="font-size:13px;color:#4A5A68">${i.removed ? 'Destino removido' : `${hm(ctx, i.saved)} de ${money(m.target)}`}${pz ? ' · ' + pz : ''}${i.perMonth ? ` · guarde ${money(i.perMonth)} por mês` : ''}</div></button>${re && !m.done ? `<div style="display:flex;flex-direction:column;justify-content:center"><button class="btn" data-act="metaUp" data-id="${m.id}" aria-label="Subir ${esc(m.name)}" ${idx === 0 ? 'disabled style="opacity:.3"' : ''}>${ico('up', '#0F1B26', 22)}</button><button class="btn" data-act="metaDown" data-id="${m.id}" aria-label="Descer ${esc(m.name)}" ${idx === n - 1 ? 'disabled style="opacity:.3"' : ''}>${ico('down', '#0F1B26', 22)}</button></div>` : ''}</div>`; };
    return `${head('Metas', 'Quanto falta para cada objetivo')}<div class="pad"><div class="dark" style="display:flex;flex-direction:column;gap:4px"><div style="font-size:13px;color:#A7B6C4">Total guardado</div><div class="big" style="font-size:30px">${hm(ctx, tt.saved)}</div>${tt.perMonth ? `<div style="font-size:13px;color:#A7B6C4">Para cumprir os prazos: ${money(tt.perMonth)} por mês</div>` : ''}</div>${act.map((m, i) => card(m, i, act.length)).join('') || '<div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhuma meta ativa.</div>'}<div style="display:flex;gap:8px"><button class="sec" style="flex:1" data-act="metaNew">+ Nova meta</button>${act.length > 1 ? `<button class="sec" style="flex:1" data-act="metaReorder">${re ? 'Pronto' : 'Ordenar'}</button>` : ''}</div>${done.length ? `<div>${lab('<span>Concluídas</span>')}<div style="display:flex;flex-direction:column;gap:10px">${done.map((m, i) => card(m, i, done.length)).join('')}</div></div>` : ''}</div>`;
  },
  meta(ctx) {
    const { s, ui } = ctx, m = s.metas.find(x => x.id === ui.params.id);
    if (!m) return `${head('Meta', '', 'metas')}<div class="pad"><div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Meta não encontrada.</div></div>`;
    const i = goalInfo(s, m, ctx.today), h = goalHistory(s, m), falta = Math.max(0, m.target - i.saved);
    const mm = m.deadline ? `${m.deadline.slice(5)}/${m.deadline.slice(0, 4)}` : '';
    return `<div style="padding:20px 8px 8px;display:flex;align-items:center;gap:4px"><button class="btn" data-act="go" data-to="metas" aria-label="Voltar">${ico('back', '#0F1B26')}</button><h1 style="font-size:26px;line-height:32px">${esc(m.name)}</h1></div>
    <div class="pad" style="gap:12px;padding-top:4px"><div class="dark" style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:baseline"><div class="big" style="font-size:30px">${i.removed ? '—' : hm(ctx, i.saved)}</div><b style="font-size:20px">${pct0(i.pct)}%</b></div>${track(i.pct, m.color, 12)}<div style="font-size:13px;color:#A7B6C4">${i.removed ? 'O destino desta meta foi removido. Edite a meta para escolher outro.' : `Meta ${money(m.target)} · falta ${money(falta)}`}</div>${m.deadline ? `<div style="font-size:13px;color:${i.late ? '#FF9AAB' : '#A7B6C4'}">${i.late ? (m.deadline < ctx.today.slice(0, 7) ? 'Prazo vencido' : 'Vence neste mês') + ' · ' + mm : 'Prazo ' + mm}${i.perMonth ? ` · guarde ${money(i.perMonth)} por mês` : ''}</div>` : ''}</div>
      ${m.done ? '<button class="pri" data-act="metaReopen">Reabrir meta</button>' : `<button class="pri" data-act="metaAport">Guardar na meta</button>`}
      <div style="display:flex;gap:8px"><button class="sec" style="flex:1" data-act="metaEdit">Editar meta</button>${m.done ? '' : '<button class="sec" style="flex:1" data-act="metaDone">Marcar como concluída</button>'}</div>
      <div>${lab(`<span>Histórico de aportes · ${h.items.length}</span>`)}<div class="card" style="padding:0 14px">${h.items.map(t => txRow(s, t)).join('')}${h.before > 0 ? `<div class="row" style="min-height:56px"><div style="display:flex;flex-direction:column"><b style="font-size:15px">Saldo de antes</b><span style="font-size:12px;color:#4A5A68">Já estava guardado, sem aporte registrado</span></div><b>${hm(ctx, h.before)}</b></div>` : ''}${!h.items.length && !(h.before > 0) ? empty('Nenhum aporte ainda.') : ''}</div></div>
      <button class="sec" data-act="metaDel" style="color:#A11D3A">Excluir meta</button></div>`;
  },
  assin(ctx) {
    const { s, ui } = ctx, sm = assinSummary(s, ctx.today), by = ui.assinSort || 'dia', srt = st => sortAssin(s.assin.filter(a => a.status === st), by), fx = fixedRepeats(s, ctx.today);
    const where = a => (a.from.kind === 'card' ? 'Cartão ' + esc(cardName(s, a.from.id)) : esc(accName(s, a.from.id)));
    const row = a => `<button class="row btn" data-act="assinOpen" data-id="${a.id}" style="width:100%;text-align:left;min-height:62px;justify-content:space-between;padding:0;opacity:${a.status === 'ativa' ? 1 : .6}"><span style="display:flex;flex-direction:column"><b style="font-size:15px">${esc(a.name)}</b><span style="font-size:12px;color:#4A5A68">dia ${a.day} · ${where(a)}</span></span><b>${money(a.value)}</b></button>`;
    const sec = (title, list, note = '') => list.length ? `<div>${lab(`<span>${title} · ${list.length}</span>`, note)}<div class="card" style="padding:0 16px">${list.map(row).join('')}</div></div>` : '';
    const seg = (k, l) => `<button class="chip ${by === k ? 'on' : ''}" data-act="assinSort" data-v="${k}">${l}</button>`;
    const nx = sm.next.length ? `<div class="card" style="padding:10px 16px"><b style="font-size:14px">Próximas cobranças</b>${sm.next.map(o => `<div style="display:flex;justify-content:space-between;min-height:40px;align-items:center;font-size:14px"><span>${esc(o.assin.name)} · ${fmtDate(o.date).slice(0, 5)}</span><b>${money(o.assin.value)}</b></div>`).join('')}</div>` : '';
    return `${head('Assinaturas', 'Tudo que se repete todo mês')}<div class="pad"><div class="dark"><div style="font-size:13px;color:#A7B6C4">Por mês</div><div class="big" style="font-size:30px">${money(sm.month)}</div><div style="font-size:13px;color:#A7B6C4">${money(sm.year)} por ano</div>${sm.saved ? `<div style="font-size:13px;color:#7FE0B5;margin-top:4px">Economia de ${money(sm.saved)} por mês com as canceladas</div>` : ''}</div>${nx}
      <div style="display:flex;gap:8px;align-items:center"><span style="font-size:13px;color:#4A5A68">Ordenar</span>${seg('dia', 'Dia')}${seg('valor', 'Valor')}${seg('nome', 'Nome')}</div>
      ${sec('Ativas', srt('ativa')) || '<div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhuma assinatura ativa.</div>'}${sec('Pausadas', srt('pausada'))}${sec('Canceladas', srt('cancelada'))}
      ${fx.length ? `<div>${lab(`<span>Despesas fixas em cartão · ${fx.length}</span>`)}<div class="card" style="padding:0 16px">${fx.map(f => `<div class="row" style="min-height:62px;justify-content:space-between"><span style="display:flex;flex-direction:column"><b style="font-size:15px">${esc(f.desc)}</b><span style="font-size:12px;color:#4A5A68">despesa fixa · dia ${f.day} · Cartão ${esc(cardName(s, f.card))} · faltam ${f.remaining}</span></span><span style="display:flex;flex-direction:column;align-items:flex-end"><b>${money(f.value)}</b><button class="btn link" data-act="stopRep" data-id="${f.repId}">Parar de repetir</button></span></div>`).join('')}</div></div>` : ''}
      <button class="sec" data-act="assinNew">+ Nova assinatura</button></div>`;
  },
  categ(ctx) {
    const { s, ui } = ctx, tp = ui.catTab || 'e', key = ui.month;
    return `${head('Categorias', monthLabel(key))}<div class="pad"><div class="seg"><button class="chip ${tp === 'e' ? 'on' : ''}" data-act="catTab" data-t="e">Despesa</button><button class="chip ${tp === 'r' ? 'on' : ''}" data-act="catTab" data-t="r">Receita</button></div>
      <div class="card" style="padding:0 16px">${listEditable(s, tp).map(c => { const g = Object.values(s.plans[key]?.catGrp || {}).length ? (s.plans[key].groups.find(x => x.id === s.plans[key].catGrp[c.name])?.n || 'Sem grupo') : ''; return `<div class="row" style="display:flex;align-items:center;min-height:62px;opacity:${c.arch ? .5 : 1}"><button class="btn" data-act="catGo" data-n="${esc(c.name)}" style="flex:1;text-align:left;justify-content:space-between;padding:0;font:inherit;min-height:62px"><span style="display:flex;align-items:center;gap:12px"><span style="width:14px;height:14px;border-radius:5px;background:${c.color}"></span><span style="display:flex;flex-direction:column"><b style="font-size:15px">${esc(c.name)}${c.arch ? ' (arquivada)' : ''}</b>${c.subs?.length ? `<span style="font-size:12px;color:#4A5A68">${esc(c.subs.join(', '))}</span>` : ''}${tp === 'e' && g ? `<span style="font-size:12px;color:#4A5A68">Grupo no Plano: ${esc(g)}</span>` : ''}</span></span><b>${money(catMonthSpend(s, c.name, key))}</b></button><button class="btn" data-act="catOpen" data-n="${esc(c.name)}" aria-label="Editar ${esc(c.name)}">${ico('pencil', '#4A5A68', 18)}</button></div>`; }).join('') || empty('Nenhuma categoria.')}</div><button class="sec" data-act="catNew">+ Nova categoria</button></div>`;
  },
  capital(ctx) {
    const { s, ui } = ctx, tab = ui.capTab || 'loc', tot = capTotals(s);
    const clsCol = cls => GCOL[Math.max(0, s.cap.classes.findIndex(c => c.n === cls)) % GCOL.length];
    const itemRow = (i, tot) => `<div style="display:flex;align-items:center;gap:8px;min-height:48px;border-top:1px solid rgba(255,255,255,.12)"><span style="width:10px;height:10px;border-radius:3px;background:${clsCol(i.cls)}"></span><button class="btn" data-act="capEdit" data-id="${i.id}" aria-label="Editar ${esc(i.name)}" style="flex:1;justify-content:flex-start;text-align:left;font:inherit;color:#fff;padding:0"><span style="display:flex;flex-direction:column"><span style="font-size:15px">${esc(i.name)}${i.linked ? ' ' + ico('link', '#A7B6C4', 14) : ''}</span><span style="font-size:12px;color:#A7B6C4">${esc(i.cls)}</span></span></button><span style="text-align:right;font-size:15px">${hm(ctx, i.value)} <span style="font-size:12px;color:#A7B6C4">${pct0(tot > 0 ? i.value / tot * 100 : 0)}%</span></span><button class="btn" data-act="capDel" data-id="${i.id}" aria-label="Tirar ${esc(i.name)} do Capital">${ico('close', '#A7B6C4', 18)}</button></div>`;
    const locCard = l => `<div class="dark" style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;align-items:center;gap:12px"><span style="width:40px;height:40px;border-radius:50%;background:#2B4EFF;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px">${esc(l.loc.charAt(0).toUpperCase())}</span><b style="flex:1;font-size:16px">${esc(l.loc)}</b><span style="font-size:12px;font-weight:700;background:rgba(255,255,255,.14);border-radius:12px;padding:4px 10px">${pct0(l.pct)}% do capital</span></div><div class="big" style="font-size:30px;line-height:34px">${hm(ctx, l.value)}</div>${splitBar(l.items.map(i => ({ v: Math.max(0, i.value), col: clsCol(i.cls) })))}<div style="display:flex;flex-direction:column">${l.items.map(i => itemRow(i, l.value)).join('')}</div><div style="display:flex"><button class="btn link" data-act="capNew" data-loc="${esc(l.loc)}" style="color:#AEBBFF">+ Ativo</button></div></div>`;
    const body = tab === 'loc'
      ? capByLoc(s).map(locCard).join('') || '<div class="card" style="padding:16px;font-size:14px;color:#4A5A68">Nenhum ativo ainda.</div>'
      : `<div class="card" style="padding:4px 16px">${capByClass(s).map(c => `<div class="grp" style="padding:12px 0"><div style="display:flex;justify-content:space-between"><b style="font-size:15px">${esc(c.cls)}${c.fora ? ' (fora das metas)' : ''}</b><b>${hm(ctx, c.value)}</b></div>${c.fora ? '' : `<div style="font-size:12px;color:#4A5A68;margin:4px 0 6px">${pct0(c.pct)}% · meta ${c.meta}% · ${c.desvioPts >= 0 ? '+' : '−'}${Math.abs(c.desvioPts).toFixed(1).replace('.', ',')} pts (${c.desvioCents >= 0 ? 'sobra' : 'falta'} ${money(Math.abs(c.desvioCents))})</div>${track(c.pct, '#2B4EFF')}`}</div>`).join('')}</div><button class="sec" data-act="capMeta">Definir metas de %</button>`;
    return `${head('Capital', 'Onde o dinheiro está')}<div class="pad"><div class="dark"><div style="font-size:13px;color:#A7B6C4">Capital total</div><div class="big" style="font-size:30px">${hm(ctx, tot.total)}</div><div style="font-size:13px;color:#A7B6C4">Investimentos ${hm(ctx, tot.investimentos)} · Reserva ${hm(ctx, tot.reserva)}</div></div>
      <div class="seg"><button class="chip ${tab === 'loc' ? 'on' : ''}" data-act="capTab" data-t="loc">Por local</button><button class="chip ${tab === 'cls' ? 'on' : ''}" data-act="capTab" data-t="cls">Por classe</button></div>${body}<div style="display:flex;gap:8px"><button class="sec" style="flex:1" data-act="capNew">+ Ativo</button><button class="sec" style="flex:1" data-act="capLink">Ligar conta</button></div></div>`;
  },
};

export const sheets = {
  metaNew: ctx => formSheet('Nova meta', [{ id: 'name', label: 'Nome' }, { id: 'target', label: 'Valor alvo', type: 'money' }, { id: 'dest', label: 'Destino', type: 'select', options: [...destOpts(ctx.s), ...ctx.s.accounts.map(a => [`new|${a.id}`, `Criar porquinho novo em ${a.name}`])] }, { id: 'deadline', label: 'Prazo (opcional)', type: 'month' }, { id: 'color', label: 'Cor', type: 'select', options: PALETTE }], 'metaSave', 'Criar meta'),
  metaEdit(ctx, d) {
    const m = ctx.s.metas.find(x => x.id === d.id), k = m.dest.kind, dv = k === 'acc' ? `acc|${m.dest.id}` : k === 'livre' ? `livre|${m.dest.acc}` : `sub|${m.dest.acc}|${m.dest.id}`;
    return formSheet('Editar meta', [{ id: 'name', label: 'Nome', value: m.name }, { id: 'target', label: 'Valor alvo', type: 'money', value: amt(m.target) }, { id: 'dest', label: 'Destino', type: 'select', value: dv, options: destOpts(ctx.s) }, { id: 'deadline', label: 'Prazo (opcional)', type: 'month', value: m.deadline || '' }, { id: 'color', label: 'Cor', type: 'select', value: m.color, options: PALETTE }], 'metaEditSave', 'Salvar');
  },
  metaAport(ctx, d) {
    const m = ctx.s.metas.find(x => x.id === d.id), i = goalInfo(ctx.s, m, ctx.today), sug = i.perMonth || Math.max(0, m.target - i.saved), first = m.dest.kind === 'acc' ? ctx.s.accounts.find(a => a.id !== m.dest.id)?.id : m.dest.acc;
    return formSheet('Guardar na meta ' + m.name, [{ id: 'value', label: 'Valor', type: 'money', value: sug > 0 ? amt(sug) : '' }, { id: 'from', label: 'Tirar do Livre de', type: 'select', value: first, options: ctx.s.accounts.map(a => [a.id, a.name]) }], 'metaContrib', 'Guardar', `<div style="font-size:13px;color:#4A5A68">É uma transferência, não uma despesa. ${i.perMonth ? 'O valor sugerido é o que falta dividido pelos meses até o prazo.' : ''}</div>`);
  },
  metaDelAsk: (ctx, d) => `<div class="sheetbg"><div class="sheet" role="dialog" aria-label="Excluir meta"><h2>Excluir a meta ${esc(ctx.s.metas.find(x => x.id === d.id)?.name || '')}?</h2><div style="font-size:14px;color:#4A5A68">O porquinho, o dinheiro e os aportes continuam onde estão. Só a meta some.</div><button class="pri" data-act="metaDelOk" style="background:#C2253F">Excluir meta</button><button class="sec" data-act="sheetClose">Cancelar</button></div></div>`,
  assinForm: (ctx, d) => formSheet(d.id ? 'Editar assinatura' : 'Nova assinatura', [{ id: 'name', label: 'Nome', value: d.name }, { id: 'value', label: 'Valor', type: 'money', value: d.value }, { id: 'day', label: 'Dia da cobrança (1 a 28)', type: 'number', value: d.day || 5 }, { id: 'from', label: 'Cobrada em', type: 'select', value: d.from, options: [...ctx.s.accounts.map(a => [`acc|${a.id}`, a.name]), ...ctx.s.cards.map(c => [`card|${c.id}`, 'Cartão ' + c.name])] }], 'assinSave', 'Salvar', d.id ? `<div class="seg"><button class="sec" data-act="assinSt" data-v="ativa">Ativar</button><button class="sec" data-act="assinSt" data-v="pausada">Pausar</button><button class="sec" data-act="assinSt" data-v="cancelada">Cancelar</button></div><div style="font-size:13px;color:#4A5A68">Mudanças valem só para os próximos meses; o que já está lançado não muda.</div><button class="sec" data-act="assinDel" style="color:#A11D3A">Excluir assinatura</button>` : ''),
  assinDelAsk: (ctx, d) => `<div class="sheetbg"><div class="sheet" role="dialog" aria-label="Excluir assinatura"><h2>Excluir a assinatura ${esc(ctx.s.assin.find(x => x.id === d.id)?.name || '')}?</h2><div style="font-size:14px;color:#4A5A68">Ela deixa de gerar cobranças nos próximos meses. O que já foi lançado continua. Se quiser guardar o histórico, prefira pausar ou cancelar.</div><button class="pri" data-act="assinDelOk" style="background:#C2253F">Excluir assinatura</button><button class="sec" data-act="sheetClose">Cancelar</button></div></div>`,
  catNew: () => formSheet('Nova categoria', [{ id: 'name', label: 'Nome' }, { id: 'color', label: 'Cor', type: 'color', value: PALETTE[0][0] }], 'catSave', 'Criar'),
  cat(ctx, d) {
    const c = ctx.s.cats.find(x => x.name === d.name), others = ctx.s.cats.filter(x => x.type === d.type && x.name !== d.name && !x.system).map(x => [x.name, x.name]);
    return formSheet(d.name, [{ id: 'name', label: 'Nome', value: d.name }, { id: 'color', label: 'Cor', type: 'color', value: c.color }, { id: 'subs', label: 'Subcategorias (separadas por vírgula)', value: (c.subs || []).join(', ') }], 'catRename', 'Salvar', `${c.arch ? '<button class="sec" data-act="catUnarch">Reativar categoria</button>' : '<button class="sec" data-act="catArch">Arquivar (some das opções novas, o histórico fica)</button>'}${others.length ? `<label>Excluir e mover lançamentos para<select id="f_dest"><option value="">Escolher categoria…</option>${others.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></label>` : ''}<button class="sec" data-act="catDel" style="color:#A11D3A">Excluir</button>`);
  },
  capNew: (ctx, d) => formSheet('Novo ativo', [{ id: 'type', label: 'Tipo', type: 'select', options: ASSET_TYPES.map(([n]) => [n, n]) }, { id: 'name', label: 'Nome (vazio = o do tipo)' }, { id: 'cls', label: 'Classe (vazio = a do tipo)' }, { id: 'loc', label: 'Local (corretora ou banco)', value: d?.loc || '' }, { id: 'value', label: 'Valor atual', type: 'money' }], 'capSave', 'Salvar', '<div style="font-size:13px;color:#4A5A68">Classe nova nasce com meta 0%. Para acompanhar uma conta sua em vez de digitar, use "Ligar conta".</div>'),
  capEdit(ctx, d) {
    const i = ctx.s.cap.items.find(x => x.id === d.id), item = capItems(ctx.s).find(x => x.id === d.id);
    if (!i) return '';
    const cls = { id: 'cls', label: 'Classe', value: i.cls };
    return i.link ? formSheet(item?.name || 'Item ligado', [cls], 'capEditSave', 'Salvar', '<div style="font-size:13px;color:#4A5A68">O valor acompanha a conta sozinho. Tirar do Capital não mexe na conta.</div>')
      : formSheet(i.n, [{ id: 'name', label: 'Nome', value: i.n }, cls, { id: 'loc', label: 'Local', value: i.loc }, { id: 'value', label: 'Valor atual', type: 'money', value: amt(i.v) }], 'capEditSave', 'Salvar');
  },
  capDelAsk: (ctx, d) => `<div class="sheetbg"><div class="sheet" role="dialog" aria-label="Tirar do Capital"><h2>Tirar ${esc(capItems(ctx.s).find(x => x.id === d.id)?.name || 'item')} do Capital?</h2><div style="font-size:14px;color:#4A5A68">Se o item é ligado a uma conta, a conta não muda. Só some da Capital.</div><button class="pri" data-act="capDelOk" style="background:#C2253F">Tirar do Capital</button><button class="sec" data-act="sheetClose">Cancelar</button></div></div>`,
  capLink: ctx => formSheet('Ligar conta ao Capital', [{ id: 'ref', label: 'Conta', type: 'select', options: destOpts(ctx.s) }], 'capLinkSave', 'Ligar'),
  capMeta: ctx => formSheet('Metas de % por classe', ctx.s.cap.classes.filter(c => !c.fora).map(c => ({ id: 'm_' + c.n.replace(/\W/g, '_'), label: c.n, type: 'number', value: c.meta })), 'capMetaSave', 'Salvar'),
};

export const acts = {
  metaNew(ctx) { ctx.openSheet('metaNew'); },
  metaSave(ctx, d, root) {
    const v = readForm(root, ['name', 'target', 'dest', 'deadline', 'color'].map(id => ({ id }))), target = parseMoney(v.target);
    if (!v.name.trim() || !target) throw new Error('Informe nome e valor alvo.');
    const [k, a] = v.dest.split('|'), base = { name: v.name.trim(), target, deadline: v.deadline || null, color: v.color };
    const next = k === 'new' ? addGoalNewSub(ctx.s, Number(a), base) : addGoal(ctx.s, { ...base, dest: parseDest(v.dest) });
    ctx.ui.sheet = null; ctx.set(next);
  },
  metaOpen(ctx, d) { ctx.go('meta', { id: Number(d.id) }); },
  metaEdit(ctx) { ctx.openSheet('metaEdit', { id: ctx.ui.params.id }); },
  metaEditSave(ctx, d, root) {
    const v = readForm(root, ['name', 'target', 'dest', 'deadline', 'color'].map(id => ({ id }))), target = parseMoney(v.target);
    if (!v.name.trim() || !target) throw new Error('Informe nome e valor alvo.');
    const next = editGoal(ctx.s, ctx.ui.sheet.d.id, { name: v.name.trim(), target, dest: parseDest(v.dest), deadline: v.deadline || null, color: v.color });
    ctx.ui.sheet = null; ctx.set(next);
  },
  metaAport(ctx) { ctx.openSheet('metaAport', { id: ctx.ui.params.id }); },
  metaContrib(ctx, d, root) {
    const v = readForm(root, [{ id: 'value' }, { id: 'from' }]), c = parseMoney(v.value);
    if (!c || c <= 0) throw new Error('Informe um valor maior que zero.');
    const id = ctx.ui.sheet.d.id, next = contribute(ctx.s, id, c, Number(v.from), ctx.today); ctx.ui.sheet = null; ctx.set(next); ctx.toast('Guardado na meta.');
  },
  metaDone(ctx) { ctx.set(completeGoal(ctx.s, ctx.ui.params.id)); },
  metaReopen(ctx) { ctx.set(reopenGoal(ctx.s, ctx.ui.params.id)); },
  metaDel(ctx) { ctx.openSheet('metaDelAsk', { id: ctx.ui.params.id }); },
  metaDelOk(ctx) { const id = ctx.ui.sheet.d.id; ctx.ui.sheet = null; ctx.set(deleteGoal(ctx.s, id)); ctx.go('metas'); ctx.toast('Meta excluída.'); },
  metaReorder(ctx) { ctx.ui.reorder = !ctx.ui.reorder; ctx.render(); },
  metaUp(ctx, d) { ctx.set(moveGoal(ctx.s, Number(d.id), -1)); },
  metaDown(ctx, d) { ctx.set(moveGoal(ctx.s, Number(d.id), 1)); },
  assinNew(ctx) { ctx.openSheet('assinForm', {}); },
  assinOpen(ctx, d) { const a = ctx.s.assin.find(x => x.id === Number(d.id)); ctx.openSheet('assinForm', { id: a.id, name: a.name, value: amt(a.value), day: a.day, from: `${a.from.kind}|${a.from.id}` }); },
  assinSave(ctx, d, root) {
    const v = readForm(root, ['name', 'value', 'day', 'from'].map(id => ({ id }))), value = parseMoney(v.value), [k, id] = v.from.split('|');
    if (!v.name.trim() || !value) throw new Error('Informe nome e valor.');
    const sh = ctx.ui.sheet.d, data = { name: v.name.trim(), value, day: Number(v.day), from: { kind: k, id: Number(id) } };
    const next = sh.id ? editAssin(ctx.s, sh.id, data) : startAssin(ctx.s, data, ctx.today);
    ctx.ui.sheet = null; ctx.set(next);
  },
  assinSort(ctx, d) { ctx.ui.assinSort = d.v; ctx.render(); },
  assinDel(ctx) { ctx.openSheet('assinDelAsk', { id: ctx.ui.sheet.d.id }); },
  assinDelOk(ctx) { const id = ctx.ui.sheet.d.id; ctx.ui.sheet = null; ctx.set(deleteAssin(ctx.s, id)); ctx.toast('Assinatura excluída.'); },
  stopRep(ctx, d) { ctx.set(stopRepeat(ctx.s, Number(d.id), ctx.today)); ctx.toast('Parou de repetir.'); },
  assinSt(ctx, d) { const id = ctx.ui.sheet.d.id; ctx.ui.sheet = null; ctx.set(setAssinStatus(ctx.s, id, d.v)); },
  catTab(ctx, d) { ctx.ui.catTab = d.t; ctx.render(); },
  catNew(ctx) { ctx.openSheet('catNew'); },
  catSave(ctx, d, root) { const v = readForm(root, [{ id: 'name' }, { id: 'color' }]); if (!v.name.trim()) throw new Error('Dê um nome.'); ctx.ui.sheet = null; ctx.set(addCat(ctx.s, { name: v.name.trim(), type: ctx.ui.catTab || 'e', color: v.color })); },
  catOpen(ctx, d) { ctx.openSheet('cat', { name: d.n, type: ctx.ui.catTab || 'e' }); },
  catRename(ctx, d, root) {
    const v = readForm(root, [{ id: 'name' }, { id: 'color' }, { id: 'subs' }]), n = v.name.trim(), old = ctx.ui.sheet.d.name; if (!n) throw new Error('Dê um nome.');
    let r = editCat(ctx.s, old, { color: v.color, subs: v.subs.split(',') }); if (n !== old) r = renameCat(r, old, n);
    ctx.ui.sheet = null; ctx.set(r);
  },
  catUnarch(ctx) { const n = ctx.ui.sheet.d.name; ctx.ui.sheet = null; ctx.set(unarchiveCat(ctx.s, n)); },
  catGo(ctx, d) { ctx.ui.filt = { t: 'all', a: 'all', c: d.n, q: '', s: 'data' }; ctx.ui.kind = 'geral'; ctx.go('lanc'); },
  catArch(ctx) { const n = ctx.ui.sheet.d.name; ctx.ui.sheet = null; ctx.set(archiveCat(ctx.s, n)); },
  catDel(ctx, d, root) { const n = ctx.ui.sheet.d.name, dest = root.querySelector('#f_dest')?.value; const r = deleteCat(ctx.s, n, dest); ctx.ui.sheet = null; ctx.set(r); },
  capTab(ctx, d) { ctx.ui.capTab = d.t; ctx.render(); },
  capNew(ctx, d) { ctx.openSheet('capNew', { loc: d?.loc || '' }); },
  capSave(ctx, d, root) {
    const v = readForm(root, ['type', 'name', 'cls', 'loc', 'value'].map(id => ({ id }))), value = parseMoney(v.value), t = ASSET_TYPES.find(x => x[0] === v.type) || ASSET_TYPES.at(-1);
    if (value === null || !v.loc.trim()) throw new Error('Informe local e valor.');
    ctx.ui.sheet = null; ctx.set(addAsset(ctx.s, { name: v.name.trim() || t[0], cls: v.cls.trim() || t[1], loc: v.loc.trim(), value }));
  },
  capEdit(ctx, d) { ctx.openSheet('capEdit', { id: Number(d.id) }); },
  capEditSave(ctx, d, root) {
    const id = ctx.ui.sheet.d.id, i = ctx.s.cap.items.find(x => x.id === id), g = k => root.querySelector('#f_' + k)?.value ?? '';
    let next;
    if (i.link) next = setItemClass(ctx.s, id, g('cls').trim() || i.cls);
    else { const value = parseMoney(g('value')); if (!g('name').trim() || !g('loc').trim() || value === null) throw new Error('Informe nome, local e valor.'); next = editAsset(ctx.s, id, { name: g('name').trim(), cls: g('cls').trim() || i.cls, loc: g('loc').trim(), value }); }
    ctx.ui.sheet = null; ctx.set(next);
  },
  capLink(ctx) { if (!ctx.s.accounts.length) throw new Error('Cadastre uma conta primeiro.'); ctx.openSheet('capLink'); },
  capLinkSave(ctx, d, root) { const ref = parseDest(readForm(root, [{ id: 'ref' }]).ref); ctx.ui.sheet = null; ctx.set(linkAccount(ctx.s, ref)); },
  capDel(ctx, d) { ctx.openSheet('capDelAsk', { id: Number(d.id) }); },
  capDelOk(ctx) { const id = ctx.ui.sheet.d.id; ctx.ui.sheet = null; ctx.set(removeAsset(ctx.s, id)); },
  capMeta(ctx) { ctx.openSheet('capMeta'); },
  capMetaSave(ctx, d, root) {
    const map = {}; for (const c of ctx.s.cap.classes.filter(x => !x.fora)) map[c.n] = Number(root.querySelector('#f_m_' + c.n.replace(/\W/g, '_')).value) || 0;
    const r = setClassMetas(ctx.s, map); ctx.ui.sheet = null; ctx.set(r);
  },
};
