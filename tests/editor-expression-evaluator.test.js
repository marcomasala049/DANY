import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateScientific, evaluateQuick, formatScientific, formatQuick
} from '../apps/editor/js/logic/expression-evaluator.js';

test('evaluateScientific: plain arithmetic', () => {
  assert.equal(evaluateScientific('2+3*4', 'DEG'), 14);
});

test('evaluateScientific: sin() follows the DEG angle mode', () => {
  assert.ok(Math.abs(evaluateScientific('sin(30)', 'DEG') - 0.5) < 1e-9);
});

test('evaluateScientific: sin() follows the RAD angle mode', () => {
  assert.ok(Math.abs(evaluateScientific('sin(90)', 'RAD') - Math.sin(90)) < 1e-9);
});

test('evaluateScientific: sqrt symbol, power operator, log10 and ln', () => {
  assert.equal(evaluateScientific('√(9)'), 3);
  assert.equal(evaluateScientific('2^3'), 8);
  assert.equal(evaluateScientific('log(100)'), 2);
  assert.ok(Math.abs(evaluateScientific('ln(e)') - 1) < 1e-9);
});

test('evaluateScientific: inv() computes 1/x', () => {
  assert.equal(evaluateScientific('inv(4)'), 0.25);
});

test('evaluateScientific: accepts comma as a decimal separator', () => {
  assert.equal(evaluateScientific('2,5+1'), 3.5);
});

test('evaluateScientific: rejects expressions with disallowed characters', () => {
  assert.throws(() => evaluateScientific('2+3;alert(1)'));
});

test('evaluateQuick: plain arithmetic', () => {
  assert.equal(evaluateQuick('120*0.85'), 102);
});

test('evaluateQuick: accepts both "pi" and the power operator', () => {
  const expected = 13.85 * 1920 * 2 * Math.PI / 60;
  assert.ok(Math.abs(evaluateQuick('13.85*1920*2*pi/60') - expected) < 1e-6);
});

test('evaluateQuick: sqrt() and power', () => {
  assert.equal(evaluateQuick('sqrt(16)'), 4);
  assert.equal(evaluateQuick('2^10'), 1024);
});

test('evaluateQuick: rejects disallowed characters', () => {
  assert.throws(() => evaluateQuick('2+3;alert(1)'));
});

test('formatScientific rejects non-finite results', () => {
  assert.throws(() => formatScientific(Infinity));
  assert.throws(() => formatScientific(NaN));
});

test('formatScientific rounds to 12 decimal places and returns a string', () => {
  assert.equal(formatScientific(1 / 3), String(Number((1 / 3).toFixed(12))));
});

test('formatQuick rejects non-finite results', () => {
  assert.throws(() => formatQuick(1 / 0));
});
