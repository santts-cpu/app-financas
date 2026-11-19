import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, seed } from './helpers.js';
import { accountView, addTx } from '../../src/core/ledger.js';
import { JSDOM } from 'jsdom';

test('editar subconta mostra o valor atual e salvar sem mudar não altera o Livre', async () => {
  const m = mount(); let a = m.ctx.s.accounts[0]; const sub = a.subs[0];
  m.ctx.set(addTx(m.ctx.s, { type: 'r', status: 'p', date: '2026-11-06', acc: a.id, sub: sub.id, value: 5000, desc: 'x', cat: 'Salário' })); a = m.ctx.s.accounts[0];
  const before = accountView(m.ctx.s, a.id);
  await m.click('[data-act=go][data-to=contas]');
  await m.click(`[data-act=subEdit][data-acc="${a.id}"][data-id="${sub.id}"]`);
  assert.equal(m.root.querySelector('#f_value').value, (before.subs[0].value / 100).toFixed(2).replace('.', ','));
  await m.click('[data-act=subSave]');
  assert.equal(accountView(m.ctx.s, a.id).livre, before.livre);
});
test('salvar lançamento com data vazia é recusado', async () => {
  const m = mount(); m.ctx.go('lanc'); const t = m.ctx.s.tx[0];
  await m.click(`[data-act=openTx][data-id="${t.id}"]`); m.setv('#f_date', '');
  await m.click('[data-act=txSave]');
  assert.equal(m.ctx.s.tx.find(x => x.id === t.id).date, t.date); assert.match(m.text(), /data/i);
});
test('falha ao gravar mostra aviso persistente', async () => {
  const { createApp } = await import('../../src/main.js');
  const dom = new JSDOM('<div id="app"></div>'), root = dom.window.document.getElementById('app');
  const app = createApp({ root, state: seed(), save: async () => { throw new Error('cota'); }, today: '2026-11-18' });
  app.ctx.set({ ...app.ctx.s }); await new Promise(r => setTimeout(r, 10));
  assert.match(root.textContent, /Não foi possível salvar/);
});
test('estado corrompido não deixa tela branca: mostra recuperação com exportar', () => {
  const { s } = { s: seed() }; s.tx.push({ id: 999, type: 'e', value: 1, status: 'p' });
  const m = mount(s);
  assert.match(m.text(), /Algo deu errado/); assert.ok(m.root.querySelector('[data-act=rescueExport]'));
});
