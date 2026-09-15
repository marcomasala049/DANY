import { test } from 'node:test';
import assert from 'node:assert/strict';
import { widgetKeyFromTitle, widgetStorageKey } from '../apps/editor/js/logic/widget-storage-keys.js';

test('widgetKeyFromTitle strips the DEG/RAD suffix the calculator adds to its own title', () => {
  assert.equal(widgetKeyFromTitle('Calcolatrice Scientifica DEG'), 'Calcolatrice Scientifica');
  assert.equal(widgetKeyFromTitle('Calcolatrice Scientifica RAD'), 'Calcolatrice Scientifica');
});

test('widgetKeyFromTitle leaves titles without the suffix untouched', () => {
  assert.equal(widgetKeyFromTitle('Sistema Orario'), 'Sistema Orario');
});

test('widgetStorageKey is deterministic for the same title', () => {
  assert.equal(widgetStorageKey('Sistema Orario'), widgetStorageKey('Sistema Orario'));
});

test('widgetStorageKey produces a safe, prefixed, lowercase key', () => {
  const key = widgetStorageKey('Mini Data Inspector');
  assert.match(key, /^widget_visibility_[a-z0-9_à-ù]+$/i);
  assert.ok(key.startsWith('widget_visibility_'));
});

test('widgetStorageKey has no leading/trailing underscores from punctuation at the edges', () => {
  assert.equal(widgetStorageKey('  Pinned Engineering Data!!  '), widgetStorageKey('Pinned Engineering Data'));
});
