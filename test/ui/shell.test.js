import test from 'node:test';
import assert from 'node:assert/strict';
import { mount } from './helpers.js';
import { initialState } from '../../src/store/db.js';

test('barra padrão tem 5 abas na ordem', () => {
  const { root } = mount();
  assert.deepEqual([...root.querySelectorAll('.bar .tab')].map(b => b.getAttribute('aria-label')), ['Início', 'Lançamentos', 'Contas', 'Plano', 'Capital']);
});
test('a barra recusa a sexta aba e Início não sai da barra', async () => {
  const m = mount();
  await m.click('[data-act=go][data-to=config]'); await m.click('[data-act=go][data-to=barra]');
  await m.click('[data-act=barAdd][data-id=metas]');
  assert.match(m.text(), /até 5 abas/i);
  assert.equal(m.ctx.s.bar.length, 5);
  assert.equal(m.root.querySelector('[data-act=barRm][data-id=inicio]'), null);
  await m.click('[data-act=barRm][data-id=capital]'); await m.click('[data-act=barAdd][data-id=metas]');
  assert.deepEqual(m.ctx.s.bar, ['inicio', 'lanc', 'contas', 'plano', 'metas']);
});
test('engrenagem abre Configurações com a seção Abas só com as fora da barra', async () => {
  const m = mount();
  await m.click('[data-act=go][data-to=config]');
  assert.match(m.text(), /Configurações/); assert.match(m.text(), /Abas/);
  assert.match(m.text(), /Assinaturas/); assert.doesNotMatch(m.root.querySelector('.pad').textContent, /Capital · /);
});
test('títulos de bloco levam à tela certa', async () => {
  const m = mount(); m.ctx.set({ ...m.ctx.s, home: ['contas', 'cartoes', 'ultimos', 'metas', 'assin', 'categorias', 'venc'] });
  for (const [label, h1] of [['Contas', 'Contas'], ['Cartões de crédito', 'Cartões'], ['Últimos lançamentos', 'Lançamentos'], ['Metas', 'Metas'], ['Assinaturas', 'Assinaturas'], ['Despesas por grupo', 'Plano']]) {
    await m.click(`[aria-label="Abrir ${label}"]`);
    assert.equal(m.root.querySelector('h1').textContent, h1, label);
    await m.click('[data-act=go][data-to=inicio]');
  }
});
test('aviso de limite aparece, tem X que dispensa e o Plano continua marcando', async () => {
  const m = mount();
  assert.match(m.text(), /passou do planejado/);
  await m.click('[data-act=alertDismiss]');
  assert.doesNotMatch(m.text(), /passou do planejado/);
  await m.click('[data-act=go][data-to=plano]');
  assert.match(m.text(), /Excedeu R\$ 200,00/);
});
test('olho esconde saldos e mantém receitas e despesas do mês', async () => {
  const m = mount();
  await m.click('[data-act=toggleVals]');
  assert.match(m.text(), /R\$ ••••/);
  assert.match(m.text(), /R\$ 4\.200,00/);
  assert.equal(m.ctx.s.prefs.hideVals, true);
});
test('estado novo (vazio) abre sem NaN nem erro', () => {
  const { text } = mount(initialState());
  assert.doesNotMatch(text(), /NaN|Infinity|undefined/);
});
test('ao abrir, gera a cobrança do mês das assinaturas ativas, sem duplicar', async () => {
  const m = mount();
  const ch = s => s.tx.filter(t => t.assinId && t.date.startsWith('2026-11'));
  assert.equal(ch(m.ctx.s).length, 1);
  assert.equal(ch(m.ctx.s)[0].status, 'n');
  const m2 = mount(m.ctx.s);
  assert.equal(ch(m2.ctx.s).length, 1);
  assert.equal(m.saved.length >= 1, true);
});
