import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtDate, monthKey, addMonths } from '../../src/core/dates.js';

test('fmtDate converte ISO para dd/mm/aaaa', () => { assert.equal(fmtDate('2026-11-18'), '18/11/2026'); });
test('monthKey extrai aaaa-mm', () => { assert.equal(monthKey('2026-11-18'), '2026-11'); });
test('addMonths vira o ano', () => { assert.equal(addMonths('2026-12', 1), '2027-01'); });
test('addMonths volta o ano', () => { assert.equal(addMonths('2026-01', -1), '2025-12'); });
