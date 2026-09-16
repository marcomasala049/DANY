import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stepStatus, findFirstUnsigned, evaluateMeasurement, summarizeSteps,
  appendNoteLine, buildSkipReason, extractSkipReasonText,
  skipTargetOptions, findPendingRepositioned, repositionTargetOf, getRepositionBadge
} from '../apps/procedure-runner/js/logic/steps.js';

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

/* ---------- Step repositioning ---------- */

test('appendNoteLine appends with a newline, or returns the line alone when notes is empty', () => {
  assert.equal(appendNoteLine('', 'first'), 'first');
  assert.equal(appendNoteLine('   ', 'first'), 'first');
  assert.equal(appendNoteLine('existing', 'new'), 'existing\nnew');
});

test('buildSkipReason formats with and without a recovery target', () => {
  assert.equal(buildSkipReason('2026-01-01 10:00', 'attrezzo non disponibile', null), '[2026-01-01 10:00] SALTATO: attrezzo non disponibile');
  assert.equal(
    buildSkipReason('2026-01-01 10:00', 'attrezzo non disponibile', '5'),
    '[2026-01-01 10:00] SALTATO: attrezzo non disponibile (In realtà da eseguire prima dello STEP 5)'
  );
});

test('extractSkipReasonText strips the timestamp/SALTATO prefix and the recovery-target suffix', () => {
  const full = '[2026-01-01 10:00] SALTATO: attrezzo non disponibile (In realtà da eseguire prima dello STEP 5)';
  assert.equal(extractSkipReasonText(full), 'attrezzo non disponibile');
});

test('extractSkipReasonText returns an empty string for an empty/missing skipReason', () => {
  assert.equal(extractSkipReasonText(''), '');
  assert.equal(extractSkipReasonText(undefined), '');
});

test('skipTargetOptions excludes the given indexes and keeps the rest in order', () => {
  const steps = [{ step: '1' }, { step: '2' }, { step: '3' }];
  const options = skipTargetOptions(steps, [1]);
  assert.deepEqual(options.map(o => o.step), ['1', '3']);
});

test('findPendingRepositioned returns only skipped steps whose repositionedTo matches the target step', () => {
  const steps = [
    { step: '1', skipReason: 'x', repositionedTo: '3' },
    { step: '2', signature: 'op', repositionedTo: '3' }, // signed, not skipped: excluded
    { step: '3' },
    { step: '4', skipReason: 'y', repositionedTo: '1' }
  ];
  const pending = findPendingRepositioned(steps, '3');
  assert.equal(pending.length, 1);
  assert.equal(pending[0].originalIndex, 0);
  assert.equal(pending[0].stepData.step, '1');
});

test('repositionTargetOf prefers the explicit field over the skipReason text', () => {
  assert.equal(repositionTargetOf({ repositionedTo: '5' }), '5');
});

test('repositionTargetOf falls back to parsing the skipReason text when the field is missing', () => {
  const step = { skipReason: '[t] SALTATO: motivo (In realtà da eseguire prima dello STEP 7)' };
  assert.equal(repositionTargetOf(step), '7');
});

test('repositionTargetOf returns null when the step was never repositioned', () => {
  assert.equal(repositionTargetOf({ skipReason: '[t] SALTATO: motivo' }), null);
  assert.equal(repositionTargetOf({}), null);
});

test('getRepositionBadge is "pending" for a skipped, repositioned step', () => {
  const badge = getRepositionBadge({ step: '1', skipReason: 'x', repositionedTo: '3' });
  assert.deepEqual(badge, { kind: 'pending', target: '3' });
});

test('getRepositionBadge is "executed" once the repositioned step is signed', () => {
  const badge = getRepositionBadge({ step: '1', signature: 'op', repositionedTo: '3' });
  assert.deepEqual(badge, { kind: 'executed', target: '3' });
});

test('getRepositionBadge is null for a step that was never repositioned', () => {
  assert.equal(getRepositionBadge({ step: '1', signature: 'op' }), null);
});
