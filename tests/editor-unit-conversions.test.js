import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convert, conversions, conversionMap } from '../apps/editor/js/logic/unit-conversions.js';

test('convert: mm to in', () => {
  assert.equal(convert('mm_in', 25.4).value, 1);
});

test('convert: RPM to rad/s', () => {
  assert.equal(convert('rpm_rads', 60).value, 6.283185);
});

test('convert: deg to rad and back round-trips', () => {
  const rad = convert('deg_rad', 180).value;
  assert.equal(rad, 3.141593);
  const deg = convert('rad_deg', rad).value;
  assert.ok(Math.abs(deg - 180) < 1e-3);
});

test('convert: bar to psi', () => {
  assert.equal(convert('bar_psi', 2).value, 29.0076);
});

test('convert returns null for an unknown conversion key', () => {
  assert.equal(convert('does_not_exist', 5), null);
});

test('convert returns null for a NaN value', () => {
  assert.equal(convert('mm_in', NaN), null);
});

test('convert returns the human-readable label alongside the value', () => {
  assert.equal(convert('kg_lb', 1).label, 'kg ➔ lb');
});

test('conversionMap pairs every key with its inverse, and every entry exists in conversions', () => {
  for (const [key, inverse] of Object.entries(conversionMap)) {
    assert.ok(key in conversions, `${key} should be a known conversion`);
    assert.ok(inverse in conversions, `${inverse} should be a known conversion`);
    assert.equal(conversionMap[inverse], key, `${key} <-> ${inverse} should be symmetric`);
  }
});

test('every conversion in conversionMap round-trips back close to the original value', () => {
  for (const [key, inverse] of Object.entries(conversionMap)) {
    const out = convert(key, 10).value;
    const back = convert(inverse, out).value;
    assert.ok(Math.abs(back - 10) < 1e-3, `${key} -> ${inverse} should round-trip (got ${back})`);
  }
});
