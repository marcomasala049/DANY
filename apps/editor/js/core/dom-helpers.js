import { $ as byId } from '../../../../shared/js/dom-utils.js';

/** Editor-local shorthand: document.getElementById bound to the current document. */
export const $ = id => byId(id, document);

/** Sets text content by id; logs (instead of throwing) when the element is missing. */
export function setText(id, text) {
  const el = $(id);
  if (!el) { console.error('[setText] elemento mancante nel DOM: #' + id); return false; }
  el.innerText = text;
  return true;
}

/** Sets innerHTML by id; logs (instead of throwing) when the element is missing. */
export function setHtml(id, html) {
  const el = $(id);
  if (!el) { console.error('[setHtml] elemento mancante nel DOM: #' + id); return false; }
  el.innerHTML = html;
  return true;
}
