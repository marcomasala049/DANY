import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegex, countMatches, findNextIndex, replaceAllMatches } from '../apps/editor/js/logic/find-replace.js';

test('escapeRegex escapes every regex metacharacter', () => {
  assert.equal(escapeRegex('a.b*c?d'), 'a\\.b\\*c\\?d');
  assert.equal(escapeRegex('(x)[y]{z}'), '\\(x\\)\\[y\\]\\{z\\}');
});

test('countMatches counts non-overlapping occurrences', () => {
  assert.equal(countMatches('abcabcabc', 'abc'), 3);
});

test('countMatches treats the query as a literal string, not a regex pattern', () => {
  assert.equal(countMatches('a.b.c', '.'), 2);
  assert.equal(countMatches('a.b.c', 'x'), 0);
});

test('countMatches returns 0 for an empty query', () => {
  assert.equal(countMatches('anything', ''), 0);
});

test('findNextIndex finds the first match at/after fromIndex', () => {
  const text = 'foo bar foo baz foo';
  assert.equal(findNextIndex(text, 'foo', 0), 0);
  assert.equal(findNextIndex(text, 'foo', 1), 8);
  assert.equal(findNextIndex(text, 'foo', 9), 16);
});

test('findNextIndex wraps around to the start when nothing is found after fromIndex', () => {
  const text = 'foo bar';
  assert.equal(findNextIndex(text, 'foo', 4), 0);
});

test('findNextIndex returns -1 when the query never occurs', () => {
  assert.equal(findNextIndex('foo bar', 'zzz', 0), -1);
});

test('findNextIndex returns -1 for an empty query', () => {
  assert.equal(findNextIndex('foo bar', '', 0), -1);
});

test('replaceAllMatches replaces every occurrence and reports the count', () => {
  const result = replaceAllMatches('cat cat cat', 'cat', 'dog');
  assert.equal(result.text, 'dog dog dog');
  assert.equal(result.count, 3);
});

test('replaceAllMatches is a no-op (count 0) when the query is not found', () => {
  const result = replaceAllMatches('cat cat', 'zzz', 'dog');
  assert.equal(result.text, 'cat cat');
  assert.equal(result.count, 0);
});
