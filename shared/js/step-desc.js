/**
 * Rich formatting for a procedure step's Description field only — bold/
 * italic/underline/table, authored in Procedure Builder's mini toolbar
 * (see apps/procedure-builder/js/ui/builder.js) and carried through to
 * Procedure Runner's execution screen and to XLSX export as real Excel
 * rich-text runs. CSV and the .txt report can't represent formatting at
 * all, so they always get the plain-text equivalent (stepHtmlToPlainText).
 *
 * step.desc is never trusted as HTML as-is — it may equally be a legacy
 * plain string (an old draft, or a value read straight from a CSV/XLSX
 * cell) or real formatted markup from this app's own toolbar. Every call
 * site that renders it as HTML MUST go through sanitizeStepHtml() first:
 * it both whitelists the formatting this feature actually offers (so
 * clipboard-pasted rich content can't smuggle in anything else) and, for
 * ordinary plain text, is a safe no-op — the HTML parser only ever turns
 * "<" into a real tag when it's immediately followed by a letter (or !/?),
 * so plain text like "Tensione < 5V" round-trips unchanged. `<script>`,
 * event-handler attributes, etc. can never survive it: disallowed tags are
 * dropped outright and every kept tag has its attributes stripped.
 */
import { escapeHtml } from './dom-utils.js';

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH']);
const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'NOSCRIPT']);

function sanitizeInto(sourceNode, targetNode, doc) {
  sourceNode.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      targetNode.appendChild(doc.createTextNode(child.textContent));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const tag = child.tagName;
    if (DROPPED_TAGS.has(tag)) return;
    if (ALLOWED_TAGS.has(tag)) {
      const clone = doc.createElement(tag.toLowerCase());
      sanitizeInto(child, clone, doc);
      targetNode.appendChild(clone);
    } else {
      // Unknown/disallowed wrapper (e.g. clipboard-pasted <span style=...>,
      // <font>, <p>...): drop the tag itself but keep its inner content.
      sanitizeInto(child, targetNode, doc);
    }
  });
}

/** Whitelists a step description's HTML down to bold/italic/underline/table/line-breaks, no attributes at all. Safe on plain text too — see module docstring. */
export function sanitizeStepHtml(html) {
  if (!html) return '';
  const doc = document.implementation.createHTMLDocument('');
  const wrapper = doc.createElement('div');
  wrapper.innerHTML = String(html);
  const out = doc.createElement('div');
  sanitizeInto(wrapper, out, doc);
  return out.innerHTML;
}

/** Escapes plain text into the same safe shape, preserving line breaks as <br>. */
export function plainTextToStepHtml(text) {
  const s = String(text ?? '');
  return s ? escapeHtml(s).replace(/\r\n|\r|\n/g, '<br>') : '';
}

/** Renders a step description down to plain text — for CSV export, the .txt report, and compact previews that can't show formatting. */
export function stepHtmlToPlainText(html) {
  if (!html) return '';
  const container = document.createElement('div');
  container.innerHTML = String(html);

  const lines = [];
  let current = '';
  const flush = () => { lines.push(current); current = ''; };

  const walk = node => {
    if (node.nodeType === Node.TEXT_NODE) { current += node.textContent; return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === 'BR') { flush(); return; }
    if (tag === 'TABLE') {
      if (current.trim()) flush();
      node.querySelectorAll('tr').forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td,th')).map(td => td.textContent.trim());
        if (cells.length) lines.push(cells.join(' | '));
      });
      return;
    }
    if (tag === 'DIV') {
      Array.from(node.childNodes).forEach(walk);
      flush();
      return;
    }
    Array.from(node.childNodes).forEach(walk);
  };

  Array.from(container.childNodes).forEach(walk);
  if (current) flush();

  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n').trim();
}

/**
 * Builds an ExcelJS cell value for a step description: real bold/italic/
 * underline runs when the text uses any formatting, a plain string
 * otherwise. A table can't be represented as an actual nested table inside
 * one Excel cell, so its rows are flattened into readable lines instead.
 */
export function stepHtmlToExcelRichText(html) {
  const plain = stepHtmlToPlainText(html);
  if (!html || !/<(b|strong|i|em|u|table)[ >]/i.test(html)) return plain;

  const container = document.createElement('div');
  container.innerHTML = String(html);

  const runs = [];
  let currentText = '';
  const flushRun = font => {
    if (!currentText) return;
    runs.push(font ? { text: currentText, font } : { text: currentText });
    currentText = '';
  };

  const walk = (node, font) => {
    if (node.nodeType === Node.TEXT_NODE) { currentText += node.textContent; return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === 'BR') { currentText += '\n'; return; }
    if (tag === 'TABLE') {
      flushRun(font);
      const tableLines = [];
      node.querySelectorAll('tr').forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td,th')).map(td => td.textContent.trim());
        if (cells.length) tableLines.push(cells.join(' | '));
      });
      if (tableLines.length) { currentText += tableLines.join('\n'); flushRun(font); }
      return;
    }
    if (tag === 'DIV') {
      Array.from(node.childNodes).forEach(c => walk(c, font));
      currentText += '\n';
      return;
    }

    let nextFont = font;
    if (tag === 'B' || tag === 'STRONG') nextFont = { ...font, bold: true };
    else if (tag === 'I' || tag === 'EM') nextFont = { ...font, italic: true };
    else if (tag === 'U') nextFont = { ...font, underline: true };

    if (nextFont !== font) flushRun(font);
    Array.from(node.childNodes).forEach(c => walk(c, nextFont));
    if (nextFont !== font) flushRun(nextFont);
  };

  Array.from(container.childNodes).forEach(c => walk(c, null));
  flushRun(null);

  if (runs.length) runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\n+$/, '');

  return runs.length ? { richText: runs.filter(r => r.text) } : plain;
}

/** Reconstructs a step description's safe HTML from an ExcelJS cell's richText runs — re-importing a file this app exported. */
export function richTextRunsToStepHtml(runs) {
  return (runs || []).map(run => {
    let html = escapeHtml(run.text || '').replace(/\r\n|\r|\n/g, '<br>');
    const font = run.font || {};
    if (font.bold) html = '<b>' + html + '</b>';
    if (font.italic) html = '<i>' + html + '</i>';
    if (font.underline) html = '<u>' + html + '</u>';
    return html;
  }).join('');
}
