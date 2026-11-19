import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../../src/store/db.js';
import { addAccount, addTx } from '../../src/core/ledger.js';
import { makeBackup, parseBackup, restore, backupDue, markBackup, toCsv, eraseAll } from '../../src/core/backup.js';

function base() {
  let s = addAccount(initialState(), { name: 'Nubank', initial: 1000 });
  return addTx(s, { type: 'e', status: 'p', date: '2026-11-10', acc: s.accounts[0].id, value: 123450, desc: 'Mercado; "caro"', cat: 'Alimentação' });
}
const NOW = '2026-11-18T12:00:00.000Z';

test('ida e volta preserva tudo', () => {
  const s = base(), p = parseBackup(JSON.stringify(makeBackup(s, NOW)));
  assert.equal(p.ok, true);
  assert.deepEqual(p.summary, { lancamentos: 1, subcontas: 0, metas: 0, assinaturas: 0 });
  assert.deepEqual(restore(initialState(), p).tx, s.tx);
});
test('JSON de outro app é recusado', () => {
  assert.equal(parseBackup('{"foo":1}').ok, false);
});
test('arquivo truncado é recusado', () => {
  const t = JSON.stringify(makeBackup(base(), NOW)); assert.equal(parseBackup(t.slice(0, 40)).ok, false);
});
test('versão futura é recusada', () => {
  const b = makeBackup(base(), NOW); b.version = 99; assert.equal(parseBackup(JSON.stringify(b)).ok, false);
});
test('restore recusa backup inválido (não troca os dados)', () => {
  assert.throws(() => restore(base(), parseBackup('lixo')), /inválido/i);
});
test('lembrete: devido após mais de 7 dias ou nunca', () => {
  const s = markBackup(base(), '2026-11-10T12:00:00.000Z');
  assert.equal(backupDue(s, NOW), true);      // 8 dias
  assert.equal(backupDue(markBackup(s, '2026-11-12T12:00:00.000Z'), NOW), false);  // 6 dias
  assert.equal(backupDue(base(), NOW), true);
});
test('CSV: separador ;, vírgula decimal, despesa negativa, aspas escapadas', () => {
  const lines = toCsv(base()).split('\n');
  assert.equal(lines[0], 'Data;Descrição;Categoria;Tipo;Valor;Status');
  assert.equal(lines[1], '10/11/2026;"Mercado; ""caro""";Alimentação;Despesa;-1234,50;Pago');
});
test('apagar tudo só com APAGAR exato', () => {
  assert.throws(() => eraseAll('apagar'), /APAGAR/);
  assert.deepEqual(eraseAll('APAGAR'), initialState());
});
