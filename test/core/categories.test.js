import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../../src/store/db.js';
import { addTx } from '../../src/core/ledger.js';
import { addCat, renameCat, archiveCat, deleteCat, catMonthSpend, listEditable, listOptions } from '../../src/core/categories.js';

function base() {
  let s = initialState();
  s = addCat(s, { name: 'Alimentação', type: 'e', color: '#2B4EFF' });
  s = addCat(s, { name: 'Mercado', type: 'e', color: '#2FA97A' });
  s = addTx(s, { type: 'e', status: 'p', date: '2026-11-10', acc: 1, value: 3000, desc: 'x', cat: 'Mercado' });
  s.plans['2026-11'] = { catGrp: { Mercado: 'cv' }, groups: [] };
  s.favs.push({ id: 90, desc: 'Pizza', cat: 'Mercado', value: 4000 });
  return s;
}

test('nome duplicado lança erro', () => {
  assert.throws(() => addCat(base(), { name: 'Mercado', type: 'e', color: '#000' }), /Já existe uma categoria com esse nome\./);
});
test('renomear atualiza lançamentos, plano e favoritos', () => {
  const r = renameCat(base(), 'Mercado', 'Supermercado');
  assert.equal(r.tx[0].cat, 'Supermercado');
  assert.equal(r.plans['2026-11'].catGrp.Supermercado, 'cv');
  assert.equal(r.favs[0].cat, 'Supermercado');
});
test('arquivar esconde das opções novas e mantém o histórico', () => {
  const r = archiveCat(base(), 'Mercado');
  assert.ok(!listOptions(r, 'e').some(c => c.name === 'Mercado'));
  assert.equal(r.tx[0].cat, 'Mercado');
});
test('excluir categoria em uso move lançamentos para o destino', () => {
  const r = deleteCat(base(), 'Mercado', 'Alimentação');
  assert.equal(r.tx[0].cat, 'Alimentação');
  assert.ok(!r.cats.some(c => c.name === 'Mercado'));
  assert.equal(r.favs[0].cat, 'Alimentação');
});
test('excluir categoria em uso sem destino lança erro', () => {
  assert.throws(() => deleteCat(base(), 'Mercado'), /destino/i);
});
test('gasto do mês por categoria soma só pagos do mês', () => {
  assert.equal(catMonthSpend(base(), 'Mercado', '2026-11'), 3000);
  assert.equal(catMonthSpend(base(), 'Mercado', '2026-10'), 0);
});
test('categorias do sistema não aparecem para editar', () => {
  const r = base(); r.cats.push({ id: 99, name: 'Cartão', type: 'e', system: true });
  assert.ok(!listEditable(r, 'e').some(c => c.name === 'Cartão'));
});
