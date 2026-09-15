/**
 * Pure helpers behind the "Mini Data Inspector" widget: delimiter sniffing,
 * numeric-column detection and column statistics. Table/chart rendering
 * stays in ui/data-inspector.js since it needs the DOM and canvas.
 */

/** Picks the delimiter (',', ';' or tab) that appears most often in the text. */
export function detectDelimiter(text) {
  const counts = {
    ',': (text.match(/,/g) || []).length,
    ';': (text.match(/;/g) || []).length,
    '\t': (text.match(/\t/g) || []).length
  };
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || ',';
}

/** True when >=80% of the non-empty cells in a column parse as numbers. */
export function isNumericCol(rows, columnIndex) {
  let numeric = 0;
  let total = 0;
  for (let r = 1; r < rows.length; r++) {
    const v = rows[r][columnIndex];
    if (v === undefined || v.trim() === '') continue;
    total++;
    if (!isNaN(parseFloat(v.replace(',', '.')))) numeric++;
  }
  return total > 0 && numeric / total >= 0.8;
}

/** Returns {min,max,mean,std,n,vals} for a numeric column, or null if empty. */
export function colStats(rows, columnIndex) {
  const vals = [];
  for (let r = 1; r < rows.length; r++) {
    const v = rows[r][columnIndex];
    if (v === undefined || v.trim() === '') continue;
    const f = parseFloat(v.replace(',', '.'));
    if (!isNaN(f)) vals.push(f);
  }
  if (!vals.length) return null;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;

  return { min, max, mean, std: Math.sqrt(variance), n: vals.length, vals };
}
