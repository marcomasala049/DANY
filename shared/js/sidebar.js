/**
 * DANI sidebar — one shared vertical navigation, injected into every tool
 * page (not the home screen, which already lists every tool as its main
 * content). Collapsed by default (icon-only, tooltips); the user's
 * expand/collapse choice persists across pages via localStorage.
 *
 * Usage (in each app's <body>, right after the opening tag):
 *   <div id="daniSidebar"></div>
 *   <script type="module">
 *     import { renderSidebar } from '../../shared/js/sidebar.js';
 *     renderSidebar({ active: 'procedure', base: '../../' });
 *   </script>
 *
 * `base` is the relative path prefix to the project root from the current
 * page (e.g. '../../' from apps/*/index.html, './' from index.html).
 */
import { daniIcon } from './dani-icons.js';

const NAV = [
  { key: 'home', label: 'Home', icon: 'home', href: 'index.html' },
  { key: 'notes', label: 'Blocco Note', icon: 'notes', href: 'apps/editor/index.html' },
  { key: 'procedure', label: 'Procedure', icon: 'procedure', href: 'apps/procedure-runner/index.html' },
  { key: 'analysis', label: 'Analisi Dati', icon: 'analysis', href: 'apps/data-analysis/index.html' },
  { key: 'inspection', label: 'Incoming Inspection', icon: 'inspection', href: 'apps/incoming_report_tool/index.html' },
  { key: 'connector', label: 'Electrical Checks', icon: 'connector', href: 'apps/pin-check/index.html' },
];

const STORAGE_KEY = 'dani_sidebar_expanded';

export function renderSidebar({ active, base = './' } = {}) {
  const mount = document.getElementById('daniSidebar');
  if (!mount) return;

  const expanded = readExpanded();

  const items = NAV.map(item => {
    const isActive = item.key === active;
    return (
      `<a class="dani-sb-item${isActive ? ' active' : ''}" href="${base}${item.href}" ` +
      `data-tooltip="${item.label}" aria-current="${isActive ? 'page' : 'false'}">` +
      `<span class="dani-sb-icon">${daniIcon(item.icon, { size: 20 })}</span>` +
      `<span class="dani-sb-label">${item.label}</span>` +
      `</a>`
    );
  }).join('');

  mount.className = 'dani-sidebar';
  mount.innerHTML =
    `<button type="button" class="dani-sb-toggle" id="daniSbToggle" data-tooltip="Espandi/riduci menu" aria-label="Espandi o riduci il menu">` +
    `<span class="dani-sb-icon">${daniIcon('menu', { size: 18 })}</span>` +
    `</button>` +
    `<nav class="dani-sb-nav">${items}</nav>`;

  document.body.classList.add('dani-has-sidebar');
  document.body.classList.toggle('sidebar-expanded', expanded);

  const toggle = document.getElementById('daniSbToggle');
  toggle.addEventListener('click', () => {
    const next = !document.body.classList.contains('sidebar-expanded');
    document.body.classList.toggle('sidebar-expanded', next);
    storeExpanded(next);
  });
}

function readExpanded() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function storeExpanded(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // localStorage unavailable — the choice just won't persist.
  }
}
