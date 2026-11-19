import { load, save as persist, requestPersist, initialState } from './store/db.js';
import { monthKey, addMonths } from './core/dates.js';
import { checkBio } from './core/bio.js';
import { hasPin, checkPin, lockWait, registerFail, registerOk } from './core/lock.js';
import { generateMonth } from './core/subs.js';
import { backupDue } from './core/backup.js';
import { ico, esc, NAV, monthStrip } from './ui/components.js';
import * as inicio from './ui/inicio.js';
import * as lanc from './ui/lanc.js';
import * as contas from './ui/contas.js';
import * as cartoes from './ui/cartoes.js';
import * as plano from './ui/plano.js';
import * as outras from './ui/outras.js';
import * as config from './ui/config.js';

const MODULES = [inicio, lanc, contas, cartoes, plano, outras, config];
const SCREENS = Object.assign({}, ...MODULES.map(m => m.screens || {}));
const SHEETS = Object.assign({}, ...MODULES.map(m => m.sheets || {}));
const ACTS = Object.assign({}, ...MODULES.map(m => m.acts || {}));

export const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function createApp({ root, state, save = async () => {}, today = isoToday() }) {
  const gen = state.assin.length ? generateMonth(state, monthKey(today)) : state;
  if (gen !== state) Promise.resolve(save(gen)).catch(() => { app.ui.saveError = true; render(); });
  const app = { s: gen, ui: { screen: 'inicio', month: monthKey(today), params: {}, sheet: null, toast: null, unlocked: false, cardTab: 'ab' }, relockMs: 60000 };
  const ctx = {
    get s() { return app.s; }, get ui() { return app.ui; }, today,
    set(next) { app.s = next; Promise.resolve(save(next)).then(() => { if (app.ui.saveError) { app.ui.saveError = false; render(); } }, () => { app.ui.saveError = true; render(); }); render(); },
    go(screen, params = {}) { app.ui.reorder = false; app.ui.screen = screen; app.ui.params = params; app.ui.sheet = null; render(); },
    openSheet(k, d = {}) { app.ui.sheet = { k, d }; render(); },
    closeSheet() { app.ui.sheet = null; render(); },
    toast(msg) { app.ui.toast = msg; render(); setTimeout(() => { if (app.ui.toast === msg) { app.ui.toast = null; render(); } }, 3500); },
    render: () => render(), persist: null,
  };

  function bar() {
    return `<nav class="bar" aria-label="Abas">${ctx.s.bar.map(id => `<button class="tab ${app.ui.screen === id ? 'on' : ''}" data-act="go" data-to="${id}" aria-label="${NAV[id][0]}">${ico(id, app.ui.screen === id ? '#fff' : '#4A5A68', 22)}${NAV[id][1]}</button>`).join('')}</nav>`;
  }
  function lockView() {
    return `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:32px"><h1>Digite a senha</h1><input id="pin" type="password" inputmode="numeric" maxlength="4" aria-label="Senha de 4 números" style="font-size:28px;text-align:center;letter-spacing:12px"><button class="pri" data-act="unlock">Entrar</button>${app.s.prefs.bio ? '<button class="sec" data-act="unlockBio">Entrar com digital</button>' : ''}${app.ui.toast ? `<div class="toast" style="position:static">${esc(app.ui.toast)}</div>` : ''}</div>`;
  }
  function render() {
    const prev = root.querySelector('.scroll'), top = prev ? prev.scrollTop : 0;
    if (hasPin(app.s) && !app.ui.unlocked) { root.innerHTML = lockView(); return; }
    const view = SCREENS[app.ui.screen] || SCREENS.inicio;
    let html;
    try {
      const sheet = app.ui.sheet ? (SHEETS[app.ui.sheet.k]?.(ctx, app.ui.sheet.d) || '') : '';
      html = `${app.ui.saveError ? '<div role="alert" style="background:#C2253F;color:#fff;padding:10px 14px;font-size:14px">Não foi possível salvar neste aparelho. Faça um backup agora.</div>' : ''}<div class="scroll">${view(ctx)}</div>${bar()}${sheet}${app.ui.toast ? `<div class="toast" role="status">${esc(app.ui.toast)}</div>` : ''}`;
    } catch (err) {
      html = `<div class="scroll"><div class="pad"><h1>Algo deu errado</h1><p style="font-size:15px">Não consegui desenhar esta tela. Seus dados continuam guardados: exporte uma cópia antes de qualquer outra coisa.</p><button class="pri" data-act="rescueExport">Exportar cópia dos dados</button><button class="sec" data-act="rescueBack">Tentar voltar ao Início</button></div></div>`;
    }
    root.innerHTML = html;
    const sc = root.querySelector('.scroll'); if (sc) sc.scrollTop = top;
  }

  const busy = new Set(), track = p => { busy.add(p); p.finally(() => busy.delete(p)); };
  root.addEventListener('click', e => track(onClick(e)));
  async function onClick(e) {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act;
    try {
      if (a === 'go') return ctx.go(el.dataset.to);
      if (a === 'month') { app.ui.month = el.dataset.k; return render(); }
      if (a === 'sheetClose') return ctx.closeSheet();
      if (a === 'rescueBack') { app.ui.screen = 'inicio'; app.ui.sheet = null; return render(); }
      if (a === 'rescueExport') { const u = URL.createObjectURL(new Blob([JSON.stringify(app.s)], { type: 'application/json' })), l = document.createElement('a'); l.href = u; l.download = 'copia-dados-financas.json'; document.body.appendChild(l); l.click(); l.remove(); return; }
      if (a === 'unlockBio') {
        if (await checkBio(app.s)) { app.ui.unlocked = true; return render(); }
        return ctx.toast('Não deu certo. Use a senha.');
      }
      if (a === 'unlock') {
        const wait = lockWait(app.s, Date.now()); if (wait > 0) return ctx.toast(`Muitas tentativas. Aguarde ${wait} s.`);
        if (await checkPin(app.s, root.querySelector('#pin').value)) { app.ui.unlocked = true; if (app.s.prefs.lock) return ctx.set(registerOk(app.s)); return render(); }
        ctx.set(registerFail(app.s, Date.now())); return ctx.toast('Senha incorreta.');
      }
      const h = ACTS[a]; if (h) await h(ctx, el.dataset, root, el);
    } catch (err) { ctx.toast(err.message || 'Algo deu errado.'); }
  }
  root.addEventListener('change', e => track(onChange(e)));
  async function onChange(e) {
    const el = e.target.closest('[data-change]'); if (!el) return;
    try { await ACTS[el.dataset.change]?.(ctx, el.dataset, root, el); } catch (err) { ctx.toast(err.message); }
  }
  root.addEventListener('input', e => {
    const el = e.target.closest('[data-input]'); if (!el) return;
    try { ACTS[el.dataset.input]?.(ctx, el.dataset, root, el); } catch (err) { ctx.toast(err.message); }
  });
  // Trava de novo quando o app fica mais de 1 minuto em segundo plano.
  const doc = root.ownerDocument; let hiddenAt = 0;
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (hiddenAt && hasPin(app.s) && Date.now() - hiddenAt >= app.relockMs) { app.ui.unlocked = false; app.ui.sheet = null; render(); }
    hiddenAt = 0;
  });
  render();
  return { ctx, render, app, idle: () => Promise.all([...busy]) };
}

export async function boot() {
  const root = document.getElementById('app');
  const state = await load();
  const a = createApp({ root, state, save: persist });
  requestPersist().then(ok => { a.ctx.persist = ok; a.render(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  return a;
}
if (typeof document !== 'undefined' && document.getElementById('app') && !globalThis.__NO_BOOT__) boot();
