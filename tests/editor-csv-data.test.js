import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectDelimiter, isNumericCol, colStats } from '../apps/editor/js/logic/csv-data.js';

test('detectDelimiter picks the most frequent of , ; or tab', () => {
  assert.equal(detectDelimiter('a,b,c\n1,2,3'), ',');
  assert.equal(detectDelimiter('a;b;c\n1;2;3'), ';');
  assert.equal(detectDelimiter('a\tb\tc\n1\t2\t3'), '\t');
});

test('detectDelimiter defaults to comma when nothing is found', () => {
  assert.equal(detectDelimiter('just one column per line'), ',');
});

// rows[0] is the header; isNumericCol/colStats only look at rows[1..].
const rows = [
  ['Name', 'Value', 'Mixed'],
  ['a', '1', 'x'],
  ['b', '2', 'y'],
  ['c', '3', '1'],
  ['d', '4', 'z'],
  ['e', 'not-a-number', 'w']
];

test('isNumericCol is true once >=80% of non-empty cells parse as numbers', () => {
  // Value column: 1,2,3,4 numeric + 1 non-numeric => 4/5 = 80%
  assert.equal(isNumericCol(rows, 1), true);
});

test('isNumericCol is false below the 80% threshold', () => {
  // Mixed column: only "1" parses => 1/5 = 20%
  assert.equal(isNumericCol(rows, 2), false);
});

test('isNumericCol ignores blank cells when computing the ratio', () => {
  const withBlanks = [['H'], ['1'], [''], ['2'], ['3']];
  assert.equal(isNumericCol(withBlanks, 0), true);
});

test('colStats computes min/max/mean/std over the parseable numeric cells', () => {
  const stats = colStats(rows, 1);
  assert.equal(stats.n, 4);
  assert.equal(stats.min, 1);
  assert.equal(stats.max, 4);
  assert.equal(stats.mean, 2.5);
  assert.ok(Math.abs(stats.std - Math.sqrt(1.25)) < 1e-9);
});

test('colStats accepts comma as a decimal separator', () => {
  const commaRows = [['H'], ['1,5'], ['2,5']];
  const stats = colStats(commaRows, 0);
  assert.equal(stats.mean, 2);
});

test('colStats only picks up the cells that actually parse as numbers', () => {
  // Mixed column has a single numeric cell ("1") among four non-numeric ones.
  assert.equal(colStats(rows, 2).n, 1);
});

test('colStats returns null when a column has no numeric cells at all', () => {
  const allText = [['H'], ['abc'], ['def']];
  assert.equal(colStats(allText, 0), null);
});
