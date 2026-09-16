/**
 * Pure helpers behind the "Trova & Sostituisci" widget: no DOM, operate on
 * plain strings so they're fully unit-testable. DOM/selection handling
 * (which needs the live <textarea>) stays in ui/find-replace.js.
 */

/** Escapes a string for safe embedding in a RegExp pattern. */
export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Counts non-overlapping occurrences of `query` in `text`. */
export function countMatches(text, query) {
  if (!query) return 0;
  try {
    return (text.match(new RegExp(escapeRegex(query), 'g')) || []).length;
  } catch {
    return 0;
  }
}

/**
 * Finds the next occurrence of `query` at/after `fromIndex`, wrapping to the
 * start of `text` if nothing is found from there on. Returns -1 if `query`
 * is empty or doesn't occur anywhere in `text`.
 */
export function findNextIndex(text, query, fromIndex) {
  if (!query) return -1;
  let idx = text.indexOf(query, fromIndex);
  if (idx === -1) idx = text.indexOf(query, 0);
  return idx;
}

/** Replaces every occurrence of `query` with `replacement`. */
export function replaceAllMatches(text, query, replacement) {
  const count = countMatches(text, query);
  if (!count) return { text, count: 0 };
  return { text: text.split(query).join(replacement), count };
}
