import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout } from '../apps/pin-check/js/logic/layout.js';

test('computeLayout returns one position per pin', () => {
  const connector = { shape: 'grid', rows: 2, cols: 5, pins: Array.from({ length: 10 }, (_, i) => ({ number: i + 1 })) };
  const positions = computeLayout(connector);
  assert.equal(positions.length, 10);
});

test('grid layout places pins row-major within 0-100', () => {
  const connector = { shape: 'grid', rows: 2, cols: 2, pins: [{ number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }] };
  const positions = computeLayout(connector);
  // pin 1 top-left, pin 2 top-right: same y, different x
  assert.equal(positions[0].y, positions[1].y);
  assert.ok(positions[0].x < positions[1].x);
  // pin 1 and pin 3 same column (x), different row (y)
  assert.equal(positions[0].x, positions[2].x);
  assert.ok(positions[0].y < positions[2].y);
  positions.forEach(p => {
    assert.ok(p.x >= 0 && p.x <= 100);
    assert.ok(p.y >= 0 && p.y <= 100);
  });
});

test('dsub layout centers each bottom pin between two top pins when bottomRow is topRow-1', () => {
  const connector = {
    shape: 'dsub', topRow: 5, bottomRow: 4,
    pins: Array.from({ length: 9 }, (_, i) => ({ number: i + 1 }))
  };
  const positions = computeLayout(connector);
  const top = positions.slice(0, 5);
  const bottom = positions.slice(5);
  assert.equal(bottom.length, 4);
  // first bottom pin should sit at the midpoint of the first two top pins
  assert.equal(bottom[0].x, (top[0].x + top[1].x) / 2);
  // bottom row is visually below the top row
  assert.ok(bottom[0].y > top[0].y);
});

test('circular layout spaces pins evenly around a centered circle', () => {
  const connector = { shape: 'circular', pins: Array.from({ length: 4 }, (_, i) => ({ number: i + 1 })) };
  const positions = computeLayout(connector);
  assert.equal(positions.length, 4);
  // the first pin (angle -90deg) should be straight above the center
  assert.ok(Math.abs(positions[0].x - 50) < 0.01);
  assert.ok(positions[0].y < 50);
});

test('computeLayout returns an empty array for a connector with no pins', () => {
  assert.deepEqual(computeLayout({ shape: 'grid', rows: 1, cols: 1, pins: [] }), []);
  assert.deepEqual(computeLayout(null), []);
});
