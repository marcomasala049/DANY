import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, csvField, toCsvText } from '../apps/procedure-runner/js/logic/csv.js';

test('parseCSV splits a simple comma-separated file into rows of fields', () => {
  assert.deepEqual(parseCSV('a,b,c\n1,2,3'), [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('parseCSV keeps a comma that is inside quotes as part of the field', () => {
  assert.deepEqual(parseCSV('a,"b,c",d'), [['a', 'b,c', 'd']]);
});

test('parseCSV unescapes doubled quotes inside a quoted field', () => {
  assert.deepEqual(parseCSV('a,"he said ""hi""",c'), [['a', 'he said "hi"', 'c']]);
});

test('parseCSV keeps a newline that is inside quotes as part of the field', () => {
  assert.deepEqual(parseCSV('a,"line1\nline2",c'), [['a', 'line1\nline2', 'c']]);
});

test('parseCSV normalizes CRLF line endings', () => {
  assert.deepEqual(parseCSV('a,b\r\nc,d'), [['a', 'b'], ['c', 'd']]);
});

test('parseCSV drops fully blank lines', () => {
  assert.deepEqual(parseCSV('a,b\n\nc,d'), [['a', 'b'], ['c', 'd']]);
});

test('csvField leaves plain values untouched', () => {
  assert.equal(csvField('plain value'), 'plain value');
});

test('csvField quotes and escapes a value containing a comma, quote or newline', () => {
  assert.equal(csvField('has,comma'), '"has,comma"');
  assert.equal(csvField('has "quote"'), '"has ""quote"""');
  assert.equal(csvField('has\nnewline'), '"has\nnewline"');
});

test('csvField treats null/undefined as an empty field', () => {
  assert.equal(csvField(null), '');
  assert.equal(csvField(undefined), '');
});

test('toCsvText + parseCSV round-trip a table with tricky values', () => {
  const rows = [
    ['Step', 'Descrizione', 'Note'],
    ['1', 'Verificare tensione, poi corrente', 'ok "confermato"'],
    ['2', 'Riga su\ndue righe', '']
  ];
  const roundTripped = parseCSV(toCsvText(rows));
  assert.deepEqual(roundTripped, rows);
});
