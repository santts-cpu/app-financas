import test from 'node:test';
import assert from 'node:assert/strict';
import { mount } from './helpers.js';

test('"+" abre as 4 opções, cada uma com a cor do tipo', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=lanc]'); await m.click('[data-act=novo]');
  const chips = [...m.root.querySelectorAll('[data-act=novoType]')];
  assert.deepEqual(chips.map(c => c.textContent.trim()), ['Despesa', 'Receita', 'Transferência', 'Cartão']);
  assert.match(chips[0].getAttribute('style'), /#C2253F/i);
  await m.click('[data-act=novoType][data-t=r]');
  assert.match(m.root.querySelector('[data-act=novoSave]').getAttribute('style'), /#0F6B47/i);
});
test('lançar despesa de R$ 42,90 muda o saldo e aparece nos lançamentos', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=lanc]'); await m.click('[data-act=novo]');
  m.setv('#f_value', '42,90'); m.setv('#f_desc', 'Padaria'); m.setv('#f_cat', 'Mercado');
  const antes = m.ctx.s.tx.length;
  await m.click('[data-act=novoSave]');
  assert.equal(m.ctx.s.tx.length, antes + 1);
  assert.match(m.text(), /Padaria/);
  assert.match(m.text(), /42,90/);
});
test('valor zero é recusado com aviso e nada é gravado', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=lanc]'); await m.click('[data-act=novo]');
  const antes = m.ctx.s.tx.length; m.setv('#f_value', '0');
  await m.click('[data-act=novoSave]');
  assert.equal(m.ctx.s.tx.length, antes); assert.match(m.text(), /maior que zero/);
});
test('filtro Cartão mostra Total gasto e contagem, sem receitas', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=lanc]');
  await m.click('[data-act=novo]'); await m.click('[data-act=novoType][data-t=c]');
  m.setv('#f_value', '100,00'); m.setv('#f_desc', 'Fone'); m.setv('#f_cat', 'Eletrônicos');
  await m.click('[data-act=novoSave]');
  await m.click('[data-act=kind][data-k=cartao]');
  assert.match(m.text(), /Total gasto R\$ 100,00 · 1/);
  assert.doesNotMatch(m.text(), /Salário/);
});
test('Efetivar move um pendente para pago', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=lanc]');
  const pend = m.ctx.s.tx.find(t => t.status === 'n' && t.cat === 'Mercado');
  await m.click(`[data-act=openTx][data-id="${pend.id}"]`); await m.click('[data-act=txEffect]');
  assert.equal(m.ctx.s.tx.find(t => t.id === pend.id).status, 'p');
});
test('excluir pede confirmação antes de apagar', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=lanc]');
  const t = m.ctx.s.tx.find(x => x.cat === 'Mercado'), n = m.ctx.s.tx.length;
  await m.click(`[data-act=openTx][data-id="${t.id}"]`); await m.click('[data-act=txDel]');
  assert.equal(m.ctx.s.tx.length, n); assert.match(m.text(), /Confirmar exclusão/);
  await m.click('[data-act=txDel]'); assert.equal(m.ctx.s.tx.length, n - 1);
});
test('Contas mostra Nubank e Santander', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=contas]');
  assert.match(m.text(), /Nubank/); assert.match(m.text(), /Santander/);
  assert.equal(m.root.querySelectorAll('.acc-card, .dark').length >= 2, true);
});
test('Cartões abre sem erro e mostra a fatura', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=cartoes]');
  assert.match(m.root.querySelector('h1').textContent, /Cartões/); assert.match(m.text(), /Nubank/);
  assert.doesNotMatch(m.text(), /NaN|undefined/);
});
