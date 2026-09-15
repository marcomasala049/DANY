/**
 * Small DOM helpers shared by every DANI app.
 * Kept dependency-free on purpose: these files run directly in the
 * browser via <script type="module">, no bundler involved.
 */

/** Shorthand for document.getElementById. */
export function $(id, root = document) {
  return root.getElementById(id);
}

/**
 * Escapes text for safe insertion into innerHTML.
 * Covers both element content (&, <, >) and quoted attribute values (", ').
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
