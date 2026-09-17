import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTolerance, evaluateResult } from '../apps/pin-check/js/logic/measurement.js';
import { MEASURE_TYPES } from '../apps/pin-check/js/data/measure-types.js';

test('parseTolerance parses a percent tolerance', () => {
  assert.deepEqual(parseTolerance('5%'), { kind: 'percent', value: 5 });
});

test('parseTolerance parses an absolute tolerance, comma or dot decimal', () => {
  assert.deepEqual(parseTolerance('0.5'), { kind: 'absolute', value: 0.5 });
  assert.deepEqual(parseTolerance('0,5'), { kind: 'absolute', value: 0.5 });
});

test('parseTolerance returns null for blank or invalid input', () => {
  assert.equal(parseTolerance(''), null);
  assert.equal(parseTolerance('  '), null);
  assert.equal(parseTolerance('abc'), null);
});

test('evaluateResult returns null when expected or measured is missing', () => {
  assert.equal(evaluateResult(MEASURE_TYPES.resistance, '', '100', '5%'), null);
  assert.equal(evaluateResult(MEASURE_TYPES.resistance, '98', '', '5%'), null);
});

test('evaluateResult returns null when no usable tolerance is given for a numeric type', () => {
  assert.equal(evaluateResult(MEASURE_TYPES.resistance, '98', '100', ''), null);
});

test('evaluateResult: pass within a percent tolerance, fail outside it', () => {
  assert.equal(evaluateResult(MEASURE_TYPES.resistance, '104', '100', '5%'), 'pass');
  assert.equal(evaluateResult(MEASURE_TYPES.resistance, '110', '100', '5%'), 'fail');
});

test('evaluateResult: pass within an absolute tolerance, fail outside it', () => {
  assert.equal(evaluateResult(MEASURE_TYPES.voltage, '12.3', '12', '0.5'), 'pass');
  assert.equal(evaluateResult(MEASURE_TYPES.voltage, '13', '12', '0.5'), 'fail');
});

test('evaluateResult: select-type (continuity) matches by exact option text', () => {
  const [ok, open] = MEASURE_TYPES.continuity.options;
  assert.equal(evaluateResult(MEASURE_TYPES.continuity, ok, ok, ''), 'pass');
  assert.equal(evaluateResult(MEASURE_TYPES.continuity, open, ok, ''), 'fail');
});

test('evaluateResult returns null for a non-numeric measured value on a numeric type', () => {
  assert.equal(evaluateResult(MEASURE_TYPES.resistance, 'abc', '100', '5%'), null);
});
