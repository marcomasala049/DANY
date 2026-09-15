/**
 * Pure string transforms for the scientific calculator's display buffer.
 * Kept separate from expression-evaluator.js because these only edit the
 * text the user is composing; they never evaluate anything.
 */

/** Appends a digit/operator token, replacing a fresh '0' or a prior error. */
export function appendToken(current, token) {
  return (current === '0' || current === 'Errore') ? token : current + token;
}

/** Appends a function call opener, e.g. "sin(" — clears a lone leading '0'. */
export function appendFunction(current, fnName) {
  return (current === '0' ? '' : current) + fnName + '(';
}

/** Removes the last character, resetting to '0' once the buffer is empty. */
export function backspace(current) {
  return current.length > 1 ? current.slice(0, -1) : '0';
}

/** Wraps the current buffer in a unary minus, unless it is still '0'. */
export function toggleSign(current) {
  return current === '0' ? current : '-(' + current + ')';
}
