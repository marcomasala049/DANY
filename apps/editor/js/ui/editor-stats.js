import { $ } from '../core/dom-helpers.js';
import { computeStats } from '../logic/editor-stats.js';

let isDirty = false;

/** Refreshes the line/word/char counters and the modified/saved indicator. */
export function updateStats() {
  const editor = $('editor');
  if (!editor) return;

  const { lines, words, chars } = computeStats(editor.value);
  const linesEl = $('statLines'), wordsEl = $('statWords'), charsEl = $('statChars');
  if (linesEl) linesEl.innerText = lines;
  if (wordsEl) wordsEl.innerText = words;
  if (charsEl) charsEl.innerText = chars;

  const dirtyEl = $('statDirty');
  if (dirtyEl) {
    dirtyEl.innerText = isDirty ? '● MOD' : '● OK';
    dirtyEl.classList.toggle('dirty', isDirty);
  }
}

/** Marks the buffer as having unsaved changes (called on every editor input). */
export function markDirty() {
  if (!isDirty) { isDirty = true; updateStats(); }
}

/** Marks the buffer as saved/freshly loaded (called after a successful save or load). */
export function clearDirty() {
  isDirty = false;
  updateStats();
}
