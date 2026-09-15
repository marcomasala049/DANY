import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendToken, appendFunction, backspace, toggleSign } from '../apps/editor/js/logic/calculator-display.js';

test('appendToken replaces a lone "0" instead of concatenating', () => {
  assert.equal(appendToken('0', '5'), '5');
});

test('appendToken replaces a prior "Errore" instead of concatenating', () => {
  assert.equal(appendToken('Errore', '7'), '7');
});

test('appendToken concatenates onto an existing expression', () => {
  assert.equal(appendToken('12', '+3'), '12+3');
});

test('appendFunction clears a lone leading "0" before the function call', () => {
  assert.equal(appendFunction('0', 'sin'), 'sin(');
});

test('appendFunction appends onto an existing expression', () => {
  assert.equal(appendFunction('5+', 'sin'), '5+sin(');
});

test('backspace removes the last character', () => {
  assert.equal(backspace('123'), '12');
});

test('backspace resets to "0" once the buffer would become empty', () => {
  assert.equal(backspace('1'), '0');
  assert.equal(backspace('0'), '0');
});

test('toggleSign wraps the current buffer in a unary minus', () => {
  assert.equal(toggleSign('42'), '-(42)');
});

test('toggleSign leaves a lone "0" alone', () => {
  assert.equal(toggleSign('0'), '0');
});
