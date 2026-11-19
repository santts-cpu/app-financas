import { ico, esc, head, lab, sw, NAV, BAR_MAX, DEFAULT_BAR, formSheet, readForm } from './components.js';
import { BLOCK_NAMES } from './inicio.js';
import { makeBackup, parseBackup, restore, markBackup, backupDue, toCsv, eraseAll } from '../core/backup.js';
import { hasPin, setPin, clearPin } from '../core/lock.js';
import { bioSupported, registerBio, removeBio } from '../core/bio.js';
import { initialState, clear } from '../store/db.js';
import { fmtDate } from '../core/dates.js';

const TABS = ['lanc', 'contas', 'plano', 'metas', 'assin', 'capital', 'cartoes', 'categ'];
const SUBT = { lanc: 'Todos os lançamentos', contas: 'Contas e subcontas', plano: 'Plano do mês', metas: 'Objetivos', assin: 'Cobranças recorrentes', capital: 'Onde o dinheiro está', cartoes: 'Faturas e limite', categ: 'Categorias de gasto' };
const row = (act, title, sub, d = '') => `<button class="nrow btn" data-act="${act}" ${d} style="width:100%;justify-content:flex-start;text-align:left;gap:16px;font:inherit;min-height:58px"><span style="flex:1;display:flex;flex-direction:column"><b style="font-size:16px">${title}</b><span style="font-size:12px;color:#4A5A68">${sub}</span></span>${ico('chev', '#9AA7B3', 18)}</button>`;

export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const screens = {
  config(ctx) {
    const { s } = ctx, out = TABS.filter(id => !s.bar.includes(id)), last = s.meta.lastBackup;
    return `${head('Configurações', '', 'inicio')}<div class="pad">
      <div class="dark" style="display:flex;flex-direction:column;gap:6px"><b style="font-size:16px">Backup</b><span style="font-size:13px;color:#A7B6C4">${last ? 'Último backup em ' + fmtDate(last) : 'Nenhum backup ainda'}${backupDue(s, new Date().toISOString()) ? ' · está na hora de fazer outro' : ''}</span><button class="btn link" data-act="go" data-to="backup" style="color:#AEBBFF;justify-content:flex-start">Abrir backup</button></div>
      ${out.length ? `<div>${lab('<span>Abas</span>')}<div class="card" style="padding:0 16px">${out.map(id => row('go', NAV[id][0], SUBT[id], `data-to="${id}"`)).join('')}</div></div>` : ''}
      <div>${lab('<span>Configurações</span>')}<div class="card" style="padding:0 16px">${row('go', 'Gerenciar início', 'Escolher e ordenar blocos', 'data-to="ginicio"')}${row('go', 'Barra inferior', 'Escolher e ordenar abas', 'data-to="barra"')}</div></div>
      <div>${lab('<span>Dados</span>')}<div class="card" style="padding:0 16px">${row('go', 'Backup e histórico', 'Salvar e restaurar', 'data-to="backup"')}${row('csvExport', 'Exportar CSV', 'Todos os lançamentos')}</div></div>
      <div>${lab('<span>Segurança</span>')}<div class="card" style="padding:0 16px">${row('pinOpen', hasPin(s) ? 'Trocar ou remover senha' : 'Bloqueio por senha', 'Só esconde a tela; não criptografa os dados')}${hasPin(s) ? row('bioToggle', s.prefs.bio ? 'Entrar com digital: ligado' : 'Entrar com digital', s.prefs.bio ? 'Toque para desligar' : 'Atalho opcional; a senha continua valendo') : ''}${row('eraseOpen', 'Apagar todos os dados', 'Não dá para desfazer')}</div></div></div>`;
  },
  barra(ctx) {
    const { s } = ctx, notIn = TABS.filter(id => !s.bar.includes(id));
    return `${head('Barra inferior', `Até ${BAR_MAX} abas`, 'config')}<div class="pad"><div class="card" style="padding:0 4px 0 6px">${s.bar.map((id, i) => `<div class="row" style="min-height:56px"><span style="flex:1;font-size:16px;font-weight:600;padding-left:12px">${NAV[id][0]}</span>${id === 'inicio' ? '<span style="font-size:12px;color:#4A5A68;padding-right:12px">fixa</span>' : `<button class="btn" data-act="barMove" data-id="${id}" data-d="-1" ${i <= 1 ? 'disabled' : ''} aria-label="Subir">${ico('up', '#0F1B26', 20)}</button><button class="btn" data-act="barMove" data-id="${id}" data-d="1" ${i === s.bar.length - 1 ? 'disabled' : ''} aria-label="Descer">${ico('down', '#0F1B26', 20)}</button><button class="btn" data-act="barRm" data-id="${id}" aria-label="Tirar ${NAV[id][0]}">${ico('minus', '#A11D3A', 22)}</button>`}</div>`).join('')}</div>
      ${notIn.length ? `<div>${lab('<span>Fora da barra</span>')}<div class="card" style="padding:0 16px">${notIn.map(id => `<div class="row"><span style="flex:1;font-size:16px">${NAV[id][0]}</span><button class="btn" data-act="barAdd" data-id="${id}" aria-label="Pôr ${NAV[id][0]}">${ico('add', '#2B4EFF', 24)}</button></div>`).join('')}</div></div>` : ''}<button class="sec" data-act="barReset">Restaurar padrão</button></div>`;
  },
  ginicio(ctx) {
    const { s } = ctx, out = Object.keys(BLOCK_NAMES).filter(k => !s.home.includes(k));
    return `${head('Gerenciar início', 'Blocos da tela inicial', 'config')}<div class="pad"><div class="card" style="padding:0 4px 0 6px">${s.home.map((k, i) => `<div class="row" style="min-height:56px"><span style="flex:1;font-size:16px;font-weight:600;padding-left:12px">${BLOCK_NAMES[k]}</span><button class="btn" data-act="homeMove" data-k="${k}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${ico('up', '#0F1B26', 20)}</button><button class="btn" data-act="homeMove" data-k="${k}" data-d="1" ${i === s.home.length - 1 ? 'disabled' : ''} aria-label="Descer">${ico('down', '#0F1B26', 20)}</button><button class="btn" data-act="homeRm" data-k="${k}" aria-label="Tirar ${BLOCK_NAMES[k]}">${ico('minus', '#A11D3A', 22)}</button></div>`).join('')}</div>
      ${out.length ? `<div>${lab('<span>Disponíveis para adicionar</span>')}<div class="card" style="padding:0 16px">${out.map(k => `<div class="row"><span style="flex:1;font-size:16px">${BLOCK_NAMES[k]}</span><button class="btn" data-act="homeAdd" data-k="${k}" aria-label="Pôr ${BLOCK_NAMES[k]}">${ico('add', '#2B4EFF', 24)}</button></div>`).join('')}</div></div>` : ''}</div>`;
  },
  backup(ctx) {
    const { s } = ctx, due = backupDue(s, new Date().toISOString()), p = ctx.ui.params.pending;
    return `${head('Backup', 'Guarde o arquivo no Drive', 'config')}<div class="pad">
      ${ctx.persist === false ? '<div style="background:#FFF1CC;border-radius:16px;padding:10px 14px;font-size:13px;color:#5B3F00">O navegador não garantiu o armazenamento permanente. Limpar os dados do navegador apaga o app: faça backup com frequência.</div>' : ''}
      <div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:6px"><b style="font-size:16px">${s.meta.lastBackup ? 'Último backup em ' + fmtDate(s.meta.lastBackup) : 'Nenhum backup ainda'}</b><span style="font-size:13px;color:#4A5A68">${due ? 'Já passou de 7 dias. ' : ''}O Início avisa depois de 7 dias sem backup.</span></div>
      <button class="pri" data-act="backupExport">Salvar backup (.json)</button>
      ${(s.meta.history || []).length ? `<div>${lab('<span>Histórico · 8 últimos</span>')}<div class="card" style="padding:0 16px">${s.meta.history.map(h => `<div class="row" style="min-height:48px;font-size:15px">${fmtDate(h)} <span style="color:#4A5A68;font-size:13px">${h.slice(11, 16)}</span></div>`).join('')}</div></div>` : ''}
      <label class="sec" style="display:flex;align-items:center;justify-content:center;cursor:pointer;color:#2A3A48;font-size:15px">Importar backup<input id="impfile" type="file" accept=".json,application/json" data-change="backupFile" style="display:none"></label>
      ${p ? `<div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:8px"><b style="font-size:15px">${p.ok ? 'Arquivo válido' : 'Arquivo recusado'}</b>${p.ok ? `<span style="font-size:13px;color:#4A5A68">${p.summary.lancamentos} lançamentos · ${p.summary.subcontas} subcontas · ${p.summary.metas} metas · ${p.summary.assinaturas} assinaturas. Isso substitui tudo que está no app agora.</span><button class="pri" data-act="backupRestore" style="background:#C2253F">Substituir meus dados</button>` : `<span style="font-size:13px;color:#A11D3A">${esc(p.error)}</span>`}</div>` : ''}</div>`;
  },
};

export const sheets = {
  pin(ctx) { return formSheet(hasPin(ctx.s) ? 'Senha' : 'Criar senha', [{ id: 'old', label: 'Senha atual', type: 'password', value: '' }, { id: 'pin', label: 'Nova senha (4 números)', type: 'password' }].filter(f => hasPin(ctx.s) || f.id !== 'old'), 'pinSave', 'Salvar', hasPin(ctx.s) ? '<button class="sec" data-act="pinRemove" style="color:#A11D3A">Remover senha</button>' : ''); },
  erase(ctx) { return formSheet('Apagar todos os dados', [{ id: 'confirm', label: 'Digite APAGAR para confirmar' }], 'eraseDo', 'Apagar tudo', '<span style="font-size:13px;color:#4A5A68">Faça o backup antes: isso não dá para desfazer.</span>'); },
};

export const acts = {
  barMove(ctx, d) { const r = structuredClone(ctx.s), i = r.bar.indexOf(d.id), j = i + Number(d.d); if (j < 1 || j >= r.bar.length) return; [r.bar[i], r.bar[j]] = [r.bar[j], r.bar[i]]; ctx.set(r); },
  barRm(ctx, d) { if (d.id === 'inicio') throw new Error('Início fica sempre na barra.'); const r = structuredClone(ctx.s); r.bar = r.bar.filter(x => x !== d.id); ctx.set(r); },
  barAdd(ctx, d) { if (ctx.s.bar.length >= BAR_MAX) throw new Error(`A barra aceita até ${BAR_MAX} abas. Tire uma antes.`); const r = structuredClone(ctx.s); r.bar.push(d.id); ctx.set(r); },
  barReset(ctx) { const r = structuredClone(ctx.s); r.bar = [...DEFAULT_BAR]; ctx.set(r); },
  homeMove(ctx, d) { const r = structuredClone(ctx.s), i = r.home.indexOf(d.k), j = i + Number(d.d); if (j < 0 || j >= r.home.length) return; [r.home[i], r.home[j]] = [r.home[j], r.home[i]]; ctx.set(r); },
  homeRm(ctx, d) { const r = structuredClone(ctx.s); r.home = r.home.filter(k => k !== d.k); ctx.set(r); },
  homeAdd(ctx, d) { const r = structuredClone(ctx.s); r.home.push(d.k); ctx.set(r); },
  backupExport(ctx) {
    const now = new Date().toISOString();
    download(`backup-financas-${now.slice(0, 10)}.json`, JSON.stringify(makeBackup(ctx.s, now), null, 2), 'application/json');
    ctx.set(markBackup(ctx.s, now)); ctx.toast('Backup salvo. Guarde o arquivo no Drive.');
  },
  async backupFile(ctx, d, root, el) {
    const f = el.files?.[0]; if (!f) return;
    ctx.ui.params = { pending: parseBackup(await f.text()) }; ctx.render();
  },
  backupRestore(ctx) {
    const p = ctx.ui.params.pending; ctx.ui.params = {}; ctx.set(restore(ctx.s, p)); ctx.toast('Backup restaurado.');
  },
  csvExport(ctx) { download('lancamentos.csv', '﻿' + toCsv(ctx.s), 'text/csv'); },
  pinOpen(ctx) { ctx.openSheet('pin'); },
  async bioToggle(ctx) {
    if (ctx.s.prefs.bio) { ctx.set(removeBio(ctx.s)); return ctx.toast('Digital desligada.'); }
    if (!(await bioSupported())) throw new Error('Este aparelho não oferece digital para o navegador. Use a senha.');
    const next = await registerBio(ctx.s); ctx.set(next); ctx.toast('Digital ligada.');
  },
  async pinSave(ctx, d, root) {
    let s = ctx.s; if (hasPin(s)) s = await clearPin(s, root.querySelector('#f_old').value);
    s = await setPin(s, root.querySelector('#f_pin').value); ctx.ui.sheet = null; ctx.set(s); ctx.toast('Senha salva.');
  },
  async pinRemove(ctx, d, root) { const s = await clearPin(ctx.s, root.querySelector('#f_old').value); ctx.ui.sheet = null; ctx.set(s); },
  eraseOpen(ctx) { ctx.openSheet('erase'); },
  eraseDo(ctx, d, root) { const s = eraseAll(root.querySelector('#f_confirm').value); ctx.ui.sheet = null; ctx.ui.screen = 'inicio'; ctx.set(s); },
};
