import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../shared/js/dom-utils.js';

test('escapeHtml escapes &, <, > for safe innerHTML insertion', () => {
  assert.equal(escapeHtml('<b>a & b</b>'), '&lt;b&gt;a &amp; b&lt;/b&gt;');
});

test('escapeHtml escapes quotes too (safe inside attribute values as well)', () => {
  assert.equal(escapeHtml(`He said "hi" and it's fine`), 'He said &quot;hi&quot; and it&#39;s fine');
});

test('escapeHtml treats null/undefined as empty string', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('escapeHtml coerces non-string input', () => {
  assert.equal(escapeHtml(42), '42');
});
