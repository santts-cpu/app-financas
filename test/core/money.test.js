import test from 'node:test';
import assert from 'node:assert/strict';
import { toCents, fmtMoney, parseMoney } from '../../src/core/money.js';

test('fmtMoney formata em reais com milhar e vírgula', () => { assert.equal(fmtMoney(123456), 'R$ 1.234,56'); });
test('fmtMoney usa sinal de menos tipográfico para negativos', () => { assert.equal(fmtMoney(-4290), '− R$ 42,90'); });
test('parseMoney lê ponto de milhar com vírgula decimal', () => { assert.equal(parseMoney('1.234,56'), 123456); });
test('parseMoney completa um dígito decimal', () => { assert.equal(parseMoney('1234,5'), 123450); });
test('parseMoney lê ponto como decimal quando não há vírgula', () => { assert.equal(parseMoney('1234.56'), 123456); });
test('parseMoney devolve null para texto inválido', () => { assert.equal(parseMoney('abc'), null); });
test('toCents soma exato 0,1 + 0,2', () => { assert.equal(toCents('0.1') + toCents('0.2'), 30); });
