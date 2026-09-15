import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapHeader, extractStep, COLMAP, PROCEDURE_COLUMNS } from '../apps/procedure-runner/js/logic/column-mapping.js';

test('mapHeader recognizes Italian headers regardless of column order', () => {
  const idx = mapHeader(['Note', 'Descrizione', 'Passo', 'Atteso']);
  assert.equal(idx.notes, 0);
  assert.equal(idx.desc, 1);
  assert.equal(idx.step, 2);
  assert.equal(idx.expected, 3);
});

test('mapHeader recognizes the English equivalents', () => {
  const idx = mapHeader(['Description', 'Expected', 'Measured', 'Signature']);
  assert.equal(idx.desc, 0);
  assert.equal(idx.expected, 1);
  assert.equal(idx.measured, 2);
  assert.equal(idx.signature, 3);
});

test('mapHeader is case- and whitespace-insensitive', () => {
  const idx = mapHeader([' DESCRIZIONE ', 'atteso']);
  assert.equal(idx.desc, 0);
  assert.equal(idx.expected, 1);
});

test('mapHeader reports -1 for columns that are not present', () => {
  const idx = mapHeader(['Descrizione']);
  assert.equal(idx.image, -1);
  assert.equal(idx.signature, -1);
});

test('mapHeader recognizes every alias declared in COLMAP', () => {
  Object.entries(COLMAP).forEach(([key, aliases]) => {
    aliases.forEach(alias => {
      const idx = mapHeader([alias]);
      assert.equal(idx[key], 0, `alias "${alias}" should map to column "${key}"`);
    });
  });
});

test('extractStep pulls values by mapped index and falls back to the ordinal for a blank Step', () => {
  const idx = mapHeader(['Step', 'Descrizione', 'Atteso']);
  const step = extractStep(idx, ['', 'Controllo visivo', '120'], 3);
  assert.equal(step.step, '3');
  assert.equal(step.desc, 'Controllo visivo');
  assert.equal(step.expected, '120');
  assert.equal(step.measured, '');
});

test('extractStep uses the provided Step value when present', () => {
  const idx = mapHeader(['Step', 'Descrizione']);
  const step = extractStep(idx, ['7', 'x'], 1);
  assert.equal(step.step, '7');
});

test('PROCEDURE_COLUMNS matches the keys extractStep produces, Step/Descrizione/Atteso first', () => {
  assert.deepEqual(PROCEDURE_COLUMNS.slice(0, 3), ['Step', 'Descrizione', 'Atteso']);
  assert.equal(PROCEDURE_COLUMNS.length, Object.keys(COLMAP).length);
});
