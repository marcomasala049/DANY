import { $ } from '../core/dom-helpers.js';
import { countMatches, findNextIndex, replaceAllMatches } from '../logic/find-replace.js';
import { markDirty, updateStats } from './editor-stats.js';

function setFindStatus(text, found) {
  const el = $('findStatus');
  if (!el) return;
  el.innerText = text;
  el.classList.toggle('found', !!found);
}

/** Refreshes the "N trovati" status without moving the selection (called as the user types). */
export function updateFindStatus() {
  const query = $('findInput').value;
  if (!query) { setFindStatus('—', false); return; }
  const total = countMatches($('editor').value, query);
  setFindStatus(total === 0 ? 'Nessuna corrispondenza' : total + ' trovati', total > 0);
}

/** Selects the next match, wrapping around, and scrolls it into view. */
export function findNext() {
  const query = $('findInput').value;
  if (!query) { updateFindStatus(); return; }
  const editor = $('editor');
  const idx = findNextIndex(editor.value, query, editor.selectionEnd);
  if (idx === -1) { setFindStatus('Nessuna corrispondenza', false); return; }

  editor.focus();
  editor.setSelectionRange(idx, idx + query.length);
  const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 18;
  const line = editor.value.slice(0, idx).split('\n').length - 1;
  editor.scrollTop = Math.max(0, line * lineHeight - editor.clientHeight / 2);

  const total = countMatches(editor.value, query);
  let n = 0;
  for (let i = 0; i <= idx; i++) { if (editor.value.substr(i, query.length) === query) n++; }
  setFindStatus(Math.min(n, total) + ' / ' + total + ' trovati', true);
}

/** Replaces the current selection if it matches the query, then seeks the next match. */
export function replaceOne() {
  const query = $('findInput').value;
  const replacement = $('replaceInput').value;
  if (!query) return;
  const editor = $('editor');

  if (editor.value.slice(editor.selectionStart, editor.selectionEnd) === query) {
    editor.setRangeText(replacement, editor.selectionStart, editor.selectionEnd, 'end');
    markDirty();
  }
  if (replacement.includes(query)) {
    const total = countMatches(editor.value, query);
    setFindStatus(total === 0 ? 'Nessuna corrispondenza' : total + ' trovati', total > 0);
    return;
  }
  findNext();
}

/** Replaces every occurrence in the whole buffer. */
export function replaceAll() {
  const query = $('findInput').value;
  const replacement = $('replaceInput').value;
  if (!query) return;
  const editor = $('editor');
  const { text, count } = replaceAllMatches(editor.value, query, replacement);
  if (!count) { setFindStatus('Nessuna corrispondenza', false); return; }
  editor.value = text;
  markDirty();
  updateStats();
  setFindStatus(count + ' sostituiti', true);
}

/** Ctrl/Cmd+F target: focuses and selects the search field's current text. */
export function focusFind() {
  const input = $('findInput');
  if (!input) return;
  input.focus();
  input.select();
}
