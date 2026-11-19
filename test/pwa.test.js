import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const sw = readFileSync('sw.js', 'utf8');
const cached = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);

test('o service worker guarda todos os arquivos de src/ (funciona offline)', () => {
  for (const f of walk('src')) assert.ok(cached.includes(f.replaceAll('\\', '/')), `faltando no cache: ${f}`);
  for (const f of ['index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']) assert.ok(cached.includes(f), f);
});
test('todo arquivo do cache existe', () => { for (const f of cached) assert.ok(existsSync(f), f); });
test('manifest é standalone, tema escuro e ícones 192 e 512', () => {
  const m = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(m.display, 'standalone'); assert.equal(m.theme_color, '#0F1B26');
  assert.deepEqual(m.icons.map(i => i.sizes), ['192x192', '512x512']);
  for (const i of m.icons) assert.ok(existsSync(i.src));
});
test('index.html liga manifest, tema e o módulo principal', () => {
  const h = readFileSync('index.html', 'utf8');
  assert.match(h, /rel="manifest"/); assert.match(h, /theme-color/); assert.match(h, /src\/main\.js/);
});
test('o cache muda de nome quando a versão muda e o SW limpa versões antigas', () => {
  assert.match(sw, /const CACHE = 'financas-v\d+'/); assert.match(sw, /caches\.delete/);
});
