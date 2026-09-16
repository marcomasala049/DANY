import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../apps/editor/js/logic/editor-stats.js';

test('computeStats counts lines/words/chars for empty text', () => {
  assert.deepEqual(computeStats(''), { lines: 0, words: 0, chars: 0 });
});

test('computeStats counts a single line with no trailing newline', () => {
  const stats = computeStats('hello world');
  assert.equal(stats.lines, 1);
  assert.equal(stats.words, 2);
  assert.equal(stats.chars, 11);
});

test('computeStats counts each newline as starting a new line', () => {
  const stats = computeStats('a\nb\nc');
  assert.equal(stats.lines, 3);
});

test('computeStats counts a trailing newline as one more (empty) line', () => {
  const stats = computeStats('a\nb\n');
  assert.equal(stats.lines, 3);
});

test('computeStats collapses runs of whitespace when counting words', () => {
  const stats = computeStats('  one   two\tthree  ');
  assert.equal(stats.words, 3);
});

test('computeStats treats whitespace-only text as zero words', () => {
  const stats = computeStats('   \n  \t');
  assert.equal(stats.words, 0);
});

test('computeStats counts every character, including whitespace', () => {
  assert.equal(computeStats('ab cd').chars, 5);
});
