import { $ } from '../core/dom-helpers.js';
import { evaluateScientific, formatScientific } from '../logic/expression-evaluator.js';
import { appendToken, appendFunction, backspace, toggleSign } from '../logic/calculator-display.js';

let calcMode = 'DEG';
let calcMemoryValue = 0;

/** Switches the trig angle mode used by calcCompute()/calcMemory(). */
export function setCalcMode(mode) {
  calcMode = mode;
  $('degBtn').classList.toggle('active', mode === 'DEG');
  $('radBtn').classList.toggle('active', mode === 'RAD');
  $('calcAngle').innerText = mode;
}

export function calcAppend(token) {
  const display = $('calcDisplay');
  display.value = appendToken(display.value, token);
}

export function calcClear() {
  $('calcDisplay').value = '0';
}

export function calcBack() {
  const display = $('calcDisplay');
  display.value = backspace(display.value);
}

export function calcFunc(fnName) {
  const display = $('calcDisplay');
  display.value = appendFunction(display.value, fnName);
}

export function calcToggleSign() {
  const display = $('calcDisplay');
  display.value = toggleSign(display.value);
}

/** M+ / M- accumulate the current display's value; MR recalls it; MC clears it. */
export function calcMemory(op) {
  let x = 0;
  try { x = evaluateScientific($('calcDisplay').value, calcMode); } catch { /* ignore, x stays 0 */ }

  if (op === 'MC') calcMemoryValue = 0;
  else if (op === 'MR') $('calcDisplay').value = String(calcMemoryValue);
  else if (!isNaN(x)) calcMemoryValue += op === 'M+' ? x : -x;
}

/** Evaluates the display expression and shows the result, or "Errore" on failure. */
export function calcCompute() {
  const display = $('calcDisplay');
  try {
    const expr = display.value;
    const result = formatScientific(evaluateScientific(expr, calcMode));
    display.value = result;
    $('calcHistory').innerText = expr + ' = ' + result;
  } catch {
    display.value = 'Errore';
  }
}
