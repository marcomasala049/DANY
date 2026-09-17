/**
 * Light/dark theme toggle shared by every app. The actual colors live as
 * CSS custom properties in shared/css/dani-theme.css (:root = dark;
 * :root[data-theme="light"] = light) — this module only decides which one
 * applies and remembers the choice. Light is the default when no
 * preference is stored yet; dark stays fully available via the toggle.
 *
 * The very first thing each page's <head> does (before the stylesheet
 * loads) is apply the resolved theme inline — see the inline script in
 * index.html — so the page never flashes the wrong theme on load; the
 * functions here keep localStorage and any toggle button in sync after that.
 */
import { daniIcon } from './dani-icons.js';

const STORAGE_KEY = 'dani_theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const THEME_COLOR = { dark: '#161011', light: '#f8f2f1' };

export function applyTheme(theme) {
  const resolved = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', resolved);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved]);
}

function storeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable (private browsing, quota, ...) - the choice
    // still applies for this page load, it just won't persist.
  }
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function updateButtonLabel(button) {
  const isLight = currentTheme() === 'light';
  // Label always names the theme the button will switch TO.
  const icon = daniIcon(isLight ? 'theme-dark' : 'theme-light', { size: 16 });
  const text = isLight ? 'Tema Scuro' : 'Tema Chiaro';
  button.innerHTML = `${icon}<span>${text}</span>`;
  button.setAttribute('aria-pressed', String(isLight));
}

/** Applies the persisted theme (defaults to light) and wires an optional toggle button. */
export function initTheme(button) {
  applyTheme(getStoredTheme() || 'light');

  if (!button) return;
  updateButtonLabel(button);
  button.addEventListener('click', () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    storeTheme(next);
    updateButtonLabel(button);
  });
}
