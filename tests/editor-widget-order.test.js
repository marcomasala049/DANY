import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortIdsByOrder } from '../apps/editor/js/logic/widget-order.js';

test('sortIdsByOrder returns the ids unchanged when there is no saved order', () => {
  assert.deepEqual(sortIdsByOrder(['A', 'B', 'C'], null), ['A', 'B', 'C']);
  assert.deepEqual(sortIdsByOrder(['A', 'B', 'C'], []), ['A', 'B', 'C']);
});

test('sortIdsByOrder reorders ids to match the saved order', () => {
  assert.deepEqual(sortIdsByOrder(['A', 'B', 'C'], ['C', 'A', 'B']), ['C', 'A', 'B']);
});

test('sortIdsByOrder puts ids absent from the saved order last, keeping their relative order', () => {
  // B and D are unranked; they must stay in their original relative order (B before D).
  assert.deepEqual(sortIdsByOrder(['A', 'B', 'C', 'D'], ['C', 'A']), ['C', 'A', 'B', 'D']);
});

test('sortIdsByOrder ignores saved ids that no longer exist in the current list', () => {
  assert.deepEqual(sortIdsByOrder(['A', 'B'], ['Z', 'B', 'A']), ['B', 'A']);
});

test('sortIdsByOrder does not mutate the input array', () => {
  const ids = ['A', 'B', 'C'];
  sortIdsByOrder(ids, ['C', 'A', 'B']);
  assert.deepEqual(ids, ['A', 'B', 'C']);
});
