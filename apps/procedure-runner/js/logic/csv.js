/**
 * Minimal RFC 4180-ish CSV codec used to load/export procedure files.
 * Pure text in, arrays out — no DOM, no File API — safe to unit test directly.
 */

/** Parses CSV text into rows of fields, handling quoted fields with embedded commas/newlines/quotes. */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

/** Quotes a CSV field only when it contains a comma, quote or newline. */
export function csvField(v) {
  v = (v ?? '').toString();
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

/** Serializes rows (arrays of values) back into CSV text. */
export function toCsvText(rows) {
  return rows.map(r => r.map(csvField).join(',')).join('\n');
}
