import { JSDOM } from 'jsdom';
import { initialState } from '../../src/store/db.js';
import { addAccount, addSub, addTx } from '../../src/core/ledger.js';
import { addCard } from '../../src/core/cards.js';
import { addCat } from '../../src/core/categories.js';
import { addAssin } from '../../src/core/subs.js';
import { addGoal } from '../../src/core/goals.js';
import { addAsset } from '../../src/core/capital.js';

globalThis.__NO_BOOT__ = true;
const { createApp } = await import('../../src/main.js');

export const TODAY = '2026-11-18';
export function seed() {
  let s = initialState();
  s = addAccount(s, { name: 'Nubank', initial: 120000 }); const nu = s.accounts[0].id;
  s = addSub(s, nu, { name: 'Viagem', value: 20000 });
  s = addAccount(s, { name: 'Santander', initial: 75000 }); const sa = s.accounts[1].id;
  s = addCard(s, { name: 'Nubank', limit: 300000, closeDay: 2, dueDay: 9, payAcc: nu });
  for (const [n, t, c] of [['Custo', 'e', '#2B4EFF'], ['Mercado', 'e', '#2FA97A'], ['Eletrônicos', 'e', '#8A5CE0'], ['Salário', 'r', '#0F6B47']]) s = addCat(s, { name: n, type: t, color: c });
  s.plans['2026-11'] = { auto: false, renda: 420000, groups: [{ id: 'cv', n: 'Custo de Vida', p: 50 }, { id: 'pf', n: 'Projetos/Futuro', p: 20 }, { id: 'la', n: 'Lazer', p: 30 }], catGrp: { Mercado: 'cv', Eletrônicos: 'pf' } };
  const e = (cat, value, status, extra = {}) => ({ type: 'e', status, date: '2026-11-10', acc: nu, value, desc: cat, cat, ...extra });
  s = addTx(s, e('Mercado', 164000, 'p')); s = addTx(s, e('Mercado', 32995, 'n')); s = addTx(s, e('Eletrônicos', 104000, 'p'));
  s = addTx(s, { type: 'r', status: 'p', date: '2026-11-05', acc: nu, value: 420000, desc: 'Salário', cat: 'Salário' });
  s = addAssin(s, { name: 'Hospedagem', value: 3999, day: 20, from: { kind: 'acc', id: nu } });
  s = addGoal(s, { name: 'Viagem', target: 100000, dest: { kind: 'sub', acc: nu, id: s.accounts[0].subs[0].id }, color: '#2B4EFF' });
  s = addAsset(s, { name: 'Tesouro Selic', cls: 'Renda fixa', loc: 'Rico', value: 150000 });
  s.favs.push({ id: 900, desc: 'Pizza', cat: 'Mercado', value: 4290, acc: nu });
  return s;
}
export function mount(state = seed()) {
  const dom = new JSDOM('<div id="app" class="app"></div>', { pretendToBeVisual: true });
  const root = dom.window.document.getElementById('app'), saved = [];
  const app = createApp({ root, state, save: async s => { saved.push(s); }, today: TODAY });
  const click = sel => { const e = root.querySelector(sel); if (!e) throw new Error('não achei ' + sel); e.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return new Promise(r => setTimeout(r, 0)); };
  const text = () => root.textContent.replace(/\s+/g, ' ');
  const setv = (sel, v) => { const e = root.querySelector(sel); if (!e) throw new Error('não achei ' + sel); e.value = v; };
  return { app, root, click, text, setv, saved, ctx: app.ctx, dom };
}
