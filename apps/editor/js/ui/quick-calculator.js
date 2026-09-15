import { $ } from '../core/dom-helpers.js';
import { evaluateQuick, formatQuick } from '../logic/expression-evaluator.js';

const MAX_HISTORY_ENTRIES = 5;

/** Evaluates #quickInput and prepends the result to the small history list. */
export function quickCalculate() {
  const raw = $('quickInput').value.trim();
  if (!raw) return;

  try {
    const out = formatQuick(evaluateQuick(raw));
    $('quickResult').innerText = '= ' + out;

    const entry = document.createElement('div');
    entry.innerText = raw + ' = ' + out;
    const history = $('quickHistory');
    history.prepend(entry);
    while (history.children.length > MAX_HISTORY_ENTRIES) history.lastChild.remove();
  } catch {
    $('quickResult').innerText = 'Errore espressione';
  }
}
