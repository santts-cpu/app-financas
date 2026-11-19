import test from 'node:test';
import assert from 'node:assert/strict';
import { mount } from './helpers.js';
import { checkPin, setPin } from '../../src/core/lock.js';
import { makeBackup } from '../../src/core/backup.js';

const pickFile = (m, text) => {
  const el = m.root.querySelector('#impfile');
  Object.defineProperty(el, 'files', { value: [{ text: async () => text }] });
  el.dispatchEvent(new m.dom.window.Event('change', { bubbles: true }));
  return new Promise(r => setTimeout(r, 10));
};

test('Configurações tem as 5 seções e Abas só lista as fora da barra', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=config]');
  const t = m.text();
  for (const sec of ['Backup', 'Abas', 'Configurações', 'Dados', 'Segurança']) assert.match(t, new RegExp(sec));
  const abas = m.root.querySelectorAll('[data-act=go][data-to=metas], [data-act=go][data-to=assin]');
  assert.equal(abas.length, 2);
  assert.equal(m.root.querySelectorAll('.pad [data-act=go][data-to=plano]').length, 0);
});
test('importar arquivo inválido mostra erro e não troca nada', async () => {
  const m = mount(); m.ctx.go('backup'); const antes = JSON.stringify(m.ctx.s);
  await pickFile(m, 'isto não é json');
  assert.match(m.text(), /Arquivo recusado/);
  assert.equal(JSON.stringify(m.ctx.s), antes);
});
test('backup válido mostra o resumo antes de confirmar e só troca ao restaurar', async () => {
  const m = mount(); m.ctx.go('backup');
  const outro = structuredClone(m.ctx.s); outro.tx = outro.tx.slice(0, 2);
  await pickFile(m, JSON.stringify(makeBackup(outro, '2026-11-18T10:00:00.000Z')));
  assert.match(m.text(), /Arquivo válido/); assert.match(m.text(), /2 lançamentos/);
  assert.equal(m.ctx.s.tx.length, 5);
  await m.click('[data-act=backupRestore]');
  assert.equal(m.ctx.s.tx.length, 2);
});
test('persist() negado mostra o aviso no Backup', async () => {
  const m = mount(); m.ctx.persist = false; m.ctx.go('backup');
  assert.match(m.text(), /não garantiu o armazenamento permanente/);
});
test('apagar só funciona digitando APAGAR', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=config]'); await m.click('[data-act=eraseOpen]');
  m.setv('#f_confirm', 'apagar'); await m.click('[data-act=eraseDo]');
  assert.ok(m.ctx.s.tx.length > 0); assert.match(m.text(), /Digite APAGAR/);
  m.setv('#f_confirm', 'APAGAR'); await m.click('[data-act=eraseDo]');
  assert.equal(m.ctx.s.tx.length, 0);
});
test('salvar backup baixa via <a download> com Blob e marca a data', async () => {
  const m = mount(); m.ctx.go('backup');
  const clicks = []; globalThis.document = m.dom.window.document;
  const orig = m.dom.window.HTMLAnchorElement.prototype.click;
  m.dom.window.HTMLAnchorElement.prototype.click = function () { clicks.push([this.download, this.href]); };
  const oc = URL.createObjectURL; URL.createObjectURL = () => 'blob:fake';
  try { await m.click('[data-act=backupExport]'); } finally { URL.createObjectURL = oc; m.dom.window.HTMLAnchorElement.prototype.click = orig; delete globalThis.document; }
  assert.equal(clicks.length, 1); assert.match(clicks[0][0], /^backup-financas-\d{4}-\d{2}-\d{2}\.json$/);
  assert.ok(m.ctx.s.meta.lastBackup);
});
test('senha: criar, e depois só desbloqueia com a certa', async () => {
  const m = mount(); await m.click('[data-act=go][data-to=config]'); await m.click('[data-act=pinOpen]');
  m.setv('#f_pin', '1234'); await m.click('[data-act=pinSave]');
  assert.equal(checkPin(m.ctx.s, '1234'), true); assert.equal(checkPin(m.ctx.s, '0000'), false);
});
test('com senha, o app abre bloqueado e só destrava com a senha certa', async () => {
  const m0 = mount(); const s = setPin(m0.ctx.s, '1234');
  const m = mount(s);
  assert.ok(m.root.querySelector('#pin')); assert.doesNotMatch(m.text(), /Nubank/);
  m.setv('#pin', '0000'); await m.click('[data-act=unlock]'); assert.match(m.text(), /incorreta/);
  m.setv('#pin', '1234'); await m.click('[data-act=unlock]'); assert.match(m.text(), /Nubank|Contas/);
});
