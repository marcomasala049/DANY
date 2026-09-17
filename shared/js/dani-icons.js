/**
 * DaniIcon — the one centralized icon system for DANI.
 *
 * Master style, reverse-engineered from the icons already shipped on the
 * home screen (index.html .card-icon-badge svg): viewBox 0 0 24 24,
 * stroke:currentColor, stroke-width 1.7, linecap/linejoin round, fill:none.
 * Every icon below follows those exact same numbers so a new icon drawn
 * for a sub-app reads as if the same designer drew the home screen's.
 *
 * No build step, no framework: this is a plain ES module usable both as
 * markup (daniIcon('save')) inside a template string built by an app's own
 * js/ui/*.js, and as progressive hydration for icons written directly in
 * static HTML (mountIcons(), looks for <span data-dani-icon="name">).
 */

const STROKE = 1.7;

// Each entry is the *inner* markup of a 24x24 viewBox SVG (no outer <svg>
// tag) — kept as plain path/shape data so every icon shares one wrapper.
const PATHS = {
  // ---- Navigation / tools -------------------------------------------------
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/>',
  notes: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  procedure: '<rect x="7" y="3" width="10" height="4" rx="1"/><path d="M15 3h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><path d="m9 13 2.5 2.5L15 11"/>',
  analysis: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  inspection: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="m9 14 2 2 4-4"/>',
  connector: '<rect x="2" y="7" width="14" height="10" rx="2"/><path d="M16 10h2"/><path d="M16 14h2"/><path d="M20 10v4"/><circle cx="7" cy="12" r="1.4"/><circle cx="11" cy="12" r="1.4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',

  // ---- File ---------------------------------------------------------------
  folder: '<path d="M4 6a2 2 0 0 1 2-2h3.5l2 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>',
  'folder-open': '<path d="M4 6a2 2 0 0 1 2-2h3.5l2 2H18a2 2 0 0 1 2 2v1H8l-2.5 8H4Z"/><path d="m5.5 17 2-8H21l-2 8a2 2 0 0 1-2 1.5H7a2 2 0 0 1-1.5-1.5Z"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  save: '<path d="M5 4h11l3 3v13H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 4v5h7V4"/><path d="M8 20v-6h8v6"/>',
  'new-file': '<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M13 3v5h5"/><path d="M12 12v5"/><path d="M9.5 14.5h5"/>',
  file: '<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M13 3v5h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 5-5 3.5 3.5L17 11l3 3"/>',

  // ---- Actions --------------------------------------------------------------
  add: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  delete: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  replace: '<path d="M17 3v5H8"/><path d="M4 12a9 9 0 0 1 13-8"/><path d="M7 21v-5h9"/><path d="M20 12a9 9 0 0 1-13 8"/>',
  expand: '<path d="M9 4H5a1 1 0 0 0-1 1v4"/><path d="M15 4h4a1 1 0 0 1 1 1v4"/><path d="M9 20H5a1 1 0 0 1-1-1v-4"/><path d="M15 20h4a1 1 0 0 0 1-1v-4"/>',
  collapse: '<path d="M4 9V5a1 1 0 0 1 1-1h4"/><path d="M20 9V5a1 1 0 0 0-1-1h-4"/><path d="M4 15v4a1 1 0 0 0 1 1h4"/><path d="M20 15v4a1 1 0 0 1-1 1h-4"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  'arrow-left': '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  swap: '<path d="m17 2 4 4-4 4"/><path d="M3 6h18"/><path d="m7 22-4-4 4-4"/><path d="M21 18H3"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1"/><path d="M6 17v4h12v-4"/>',
  'lock-open': '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/>',

  // ---- Analysis ---------------------------------------------------------
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  'chart-line': '<path d="M3 3v18h18"/><path d="m5 15 4-5 4 3 6-8"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6a8 3 0 0 0 16 0V5"/><path d="M4 11v6a8 3 0 0 0 16 0v-6"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M9 4v16"/>',
  spectrum: '<path d="M3 20V10"/><path d="M8 20V4"/><path d="M13 20v-7"/><path d="M18 20V7"/><path d="M21 20H3"/>',
  cursor: '<path d="m5 3 5.5 15L12 12l6-1.5Z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
  'zoom-in': '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>',
  'zoom-out': '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/>',

  // ---- Procedure / status -------------------------------------------------
  checklist: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8"/><path d="M8 15h1"/><path d="M13 9h4"/><path d="M13 15h4"/>',
  step: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  play: '<path d="M7 4.5v15l12-7.5Z"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  pass: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9"/>',
  fail: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5l5 5"/><path d="M14.5 9.5l-5 5"/>',
  warning: '<path d="M12 3.5 2.5 20h19Z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
  running: '<circle cx="12" cy="12" r="9"/><path d="M12 12 8 8"/><path d="M12 7v5"/>',
  completed: '<circle cx="12" cy="12" r="9"/><path d="m7.5 12.5 3 3 6-7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4h12l-3 4 3 4H6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>',

  // ---- Hardware / engineering ----------------------------------------------
  pin: '<rect x="2" y="7" width="14" height="10" rx="2"/><path d="M16 10h2"/><path d="M16 14h2"/><path d="M20 10v4"/><circle cx="7" cy="12" r="1.4"/><circle cx="11" cy="12" r="1.4"/>',
  resistance: '<path d="M3 12h3"/><path d="M6 12 8 7l3 10 3-10 3 10 2-5"/><path d="M18 12h3"/>',
  voltage: '<path d="M13 2 4 14h6l-1 8 9-12h-6Z"/>',
  probe: '<path d="M4 4v9a4 4 0 0 0 8 0V4"/><path d="M2 4h6"/><path d="M6 17v4"/><path d="M12 12h6"/><path d="M15 9v6"/>',
  tools: '<path d="M14.5 6.5 18 3l3 3-3.5 3.5"/><path d="m13 8-9 9 3 3 9-9"/><path d="M6 4 4 6l2 2 2-2Z"/><path d="m16 12 4 4-2 2-4-4"/>',
  gauge: '<circle cx="12" cy="13" r="8"/><path d="M12 13 15 9"/><path d="M9 4.5 8 6"/><path d="M15 4.5 16 6"/>',
  motor: '<rect x="3" y="8" width="12" height="8" rx="1.5"/><path d="M15 11h3v2h-3"/><path d="M20 10v4"/><path d="M6 8V6"/><path d="M10 8V6"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6Z"/>',
  calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h1"/><path d="M11.5 11h1"/><path d="M15 11h1"/><path d="M8 15h1"/><path d="M11.5 15h1"/><path d="M15 15h1"/><path d="M8 19h1"/><path d="M11.5 19h1"/><path d="M15 19h1"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2Z"/><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2Z"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 20h8"/><path d="M12 17v3"/>',

  // ---- System ---------------------------------------------------------------
  'theme-light': '<circle cx="12" cy="12" r="4.2"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M3 12h2"/><path d="M19 12h2"/><path d="M4.9 19.1l1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/>',
  'theme-dark': '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  status: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
  offline: '<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 6.7-.3"/><path d="M5.5 13.5a9 9 0 0 1 3-2"/><path d="M12 20h.01"/>',
  online: '<path d="M5.5 13.5a9 9 0 0 1 13 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>',
  install: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 18h6"/><path d="M12 6v6"/><path d="m9.5 9.5 2.5 2.5 2.5-2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  layers: '<path d="m12 3 8 4.5-8 4.5-8-4.5Z"/><path d="m4 12 8 4.5 8-4.5"/><path d="m4 16.5 8 4.5 8-4.5"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
};

/**
 * Returns a full <svg> markup string for the given icon name. Unknown names
 * render as an empty 24x24 svg (fails soft — a missing icon shows nothing
 * rather than breaking the page or throwing).
 */
export function daniIcon(name, { size = 20, className = '', title = '' } = {}) {
  const inner = PATHS[name] || '';
  const cls = ['dani-icon', className].filter(Boolean).join(' ');
  const titleTag = title ? `<title>${escapeAttr(title)}</title>` : '';
  return (
    `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="currentColor" stroke-width="${STROKE}" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="${title ? 'false' : 'true'}" ` +
    `focusable="false">${titleTag}${inner}</svg>`
  );
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** True if `name` has a registered icon — lets callers fall back gracefully. */
export function hasDaniIcon(name) {
  return Object.prototype.hasOwnProperty.call(PATHS, name);
}

/**
 * Hydrates every `<span data-dani-icon="name" [data-dani-size="20"]>` under
 * `root` with the matching icon's markup. Safe to call multiple times (it
 * skips spans already hydrated). Use this for icons written directly into
 * static HTML; use daniIcon() directly inside template strings built by JS.
 */
export function mountIcons(root = document) {
  root.querySelectorAll('[data-dani-icon]').forEach(el => {
    if (el.dataset.daniMounted === '1') return;
    const name = el.getAttribute('data-dani-icon');
    const size = Number(el.getAttribute('data-dani-size')) || 18;
    el.innerHTML = daniIcon(name, { size });
    el.dataset.daniMounted = '1';
  });
}
