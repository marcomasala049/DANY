import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepStatus, findFirstUnsigned, evaluateMeasurement, summarizeSteps } from '../apps/procedure-runner/js/logic/steps.js';

test('stepStatus: skipped takes priority, then signed, then pending', () => {
  assert.equal(stepStatus({ skipReason: 'no tool available' }), 'skipped');
  assert.equal(stepStatus({ signature: 'm.rossi' }), 'signed');
  assert.equal(stepStatus({}), 'pending');
});

test('stepStatus treats a whitespace-only signature/skipReason as not set', () => {
  assert.equal(stepStatus({ signature: '   ' }), 'pending');
  assert.equal(stepStatus({ skipReason: '   ' }), 'pending');
});

test('findFirstUnsigned returns the index of the first step that is neither signed nor skipped', () => {
  const steps = [{ signature: 'a' }, {}, { skipReason: 'x' }];
  assert.equal(findFirstUnsigned(steps), 1);
});

test('findFirstUnsigned returns steps.length once every step is done', () => {
  const steps = [{ signature: 'a' }, { skipReason: 'x' }];
  assert.equal(findFirstUnsigned(steps), 2);
});

test('evaluateMeasurement: within 5% of the expected value is "ok"', () => {
  const result = evaluateMeasurement('120', '121');
  assert.equal(result.kind, 'ok');
  assert.equal(result.expectedNum, 120);
  assert.equal(result.measuredNum, 121);
});

test('evaluateMeasurement: more than 5% off is "anomaly"', () => {
  const result = evaluateMeasurement('120', '130');
  assert.equal(result.kind, 'anomaly');
});

test('evaluateMeasurement: non-numeric expected or empty measured skip the check', () => {
  assert.equal(evaluateMeasurement('', '5').kind, 'not-numeric');
  assert.equal(evaluateMeasurement('Conforme', '5').kind, 'not-numeric');
  assert.equal(evaluateMeasurement('120', '').kind, 'not-numeric');
  assert.equal(evaluateMeasurement('120', '   ').kind, 'not-numeric');
});

test('evaluateMeasurement: a non-numeric measured value against a numeric expected is "invalid-number"', () => {
  const result = evaluateMeasurement('120', 'abc');
  assert.equal(result.kind, 'invalid-number');
  assert.equal(result.measuredStr, 'abc');
});

test('evaluateMeasurement: an expected value of 0 never triggers the anomaly check (avoids divide-by-zero)', () => {
  assert.equal(evaluateMeasurement('0', '5').kind, 'ok');
});

test('evaluateMeasurement: accepts comma as a decimal separator on both sides', () => {
  assert.equal(evaluateMeasurement('12,5', '12,6').kind, 'ok');
});

test('summarizeSteps counts signed/skipped/modified and builds recap lines', () => {
  const steps = [
    { step: '1', signature: 'op' },
    { step: '2', skipReason: 'motivo tecnico' },
    { step: '3', correction: 'testo corretto' },
    { step: '4' }
  ];
  const summary = summarizeSteps(steps);
  assert.equal(summary.countSigned, 1);
  assert.equal(summary.countSkipped, 1);
  assert.equal(summary.countModified, 1);
  assert.equal(summary.skippedList.length, 1);
  assert.match(summary.skippedList[0], /Passo 2/);
  assert.match(summary.skippedList[0], /motivo tecnico/);
  assert.equal(summary.modifiedList.length, 1);
  assert.match(summary.modifiedList[0], /Passo 3/);
});

test('summarizeSteps: a skipped step is not double-counted as signed even if it once had a signature field', () => {
  const steps = [{ step: '1', skipReason: 'saltato', signature: '' }];
  const summary = summarizeSteps(steps);
  assert.equal(summary.countSigned, 0);
  assert.equal(summary.countSkipped, 1);
});
