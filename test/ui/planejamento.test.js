import test from 'node:test';
import assert from 'node:assert/strict';
import { mount } from './helpers.js';

const bad = /NaN|Infinity|undefined|\[object/;
test('Plano mostra grupos, excedeu e renda sem erro', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=plano]');
  assert.match(m.text(), /Custo de Vida/); assert.match(m.text(), /Excedeu R\$ 200,00/);
  assert.doesNotMatch(m.text(), bad);
});
test('abrir um grupo mostra suas categorias e voltar funciona', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=plano]');
  await m.click('[data-act=openGrp][data-id=cv]');
  assert.match(m.text(), /Mercado/); assert.doesNotMatch(m.text(), bad);
});
test('editar o plano: soma diferente de 100 só avisa e não bloqueia', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=plano]'); await m.click('[data-act=planEdit]');
  assert.match(m.root.querySelector('.sheet').textContent, /Soma 100%/);
  const p = m.root.querySelector('#f_gp0'); p.value = '10';
  p.dispatchEvent(new m.dom.window.Event('input', { bubbles: true }));
  assert.match(m.root.querySelector('.sheet').textContent, /Soma 60%/);
  await m.click('[data-act=planSave]');
  assert.equal(m.ctx.s.plans['2026-11'].groups[0].p, 10);
});
test('Metas, Assinaturas, Categorias e Capital abrem sem NaN', async () => {
  const m = mount();
  for (const to of ['metas', 'assin', 'categ', 'capital']) {
    m.ctx.go(to); await new Promise(r => setTimeout(r, 0));
    assert.doesNotMatch(m.text(), bad, to);
    assert.ok(m.root.querySelector('h1'), to);
  }
});
test('Metas mostra a meta Viagem com progresso', async () => {
  const m = mount(); m.ctx.go('metas');
  assert.match(m.text(), /Viagem/); assert.match(m.text(), /200,00/);
});
test('nova meta exige nome e valor', async () => {
  const m = mount(); m.ctx.go('metas'); await m.click('[data-act=metaNew]');
  const n = m.ctx.s.metas.length; await m.click('[data-act=metaSave]');
  assert.equal(m.ctx.s.metas.length, n);
});
test('Assinaturas lista Hospedagem e o total mensal', async () => {
  const m = mount(); m.ctx.go('assin');
  assert.match(m.text(), /Hospedagem/); assert.match(m.text(), /39,99/);
});
test('Categorias: excluir categoria em uso exige destino', async () => {
  const m = mount(); m.ctx.go('categ');
  assert.match(m.text(), /Mercado/);
  await m.click('[data-act=catOpen][data-n=Mercado]'); await m.click('[data-act=catDel]');
  assert.ok(m.ctx.s.tx.some(t => t.cat === 'Mercado'));
  assert.match(m.text(), /categoria de destino/);
  m.setv('#f_dest', 'Custo'); await m.click('[data-act=catDel]');
  assert.ok(!m.ctx.s.tx.some(t => t.cat === 'Mercado'));
});
test('Capital: Reserva fica fora da base e a soma das metas deve ser 100', async () => {
  const m = mount(); m.ctx.go('capital');
  assert.match(m.text(), /Tesouro Selic/);
  await m.click('[data-act=capTab][data-t=cls]'); await m.click('[data-act=capMeta]');
  const inputs = [...m.root.querySelectorAll('[id^=f_]')]; assert.ok(inputs.length);
  inputs[0].value = '90'; const antes = JSON.stringify(m.ctx.s.cap.classes);
  await m.click('[data-act=capMetaSave]');
  assert.equal(JSON.stringify(m.ctx.s.cap.classes), antes);
});
