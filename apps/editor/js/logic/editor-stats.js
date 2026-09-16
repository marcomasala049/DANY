/** Pure helper behind the "Editor Stats" widget: line/word/char counts. */

/** Returns {lines, words, chars} for the given editor text. */
export function computeStats(text) {
  const v = text || '';
  const lines = v ? v.split('\n').length : 0;
  const words = v.trim() ? v.trim().split(/\s+/).length : 0;
  return { lines, words, chars: v.length };
}
