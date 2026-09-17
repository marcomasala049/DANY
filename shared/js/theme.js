/**
 * Light/dark theme toggle shared by both apps. The actual colors live as
 * CSS custom properties in each app's stylesheet (:root = dark, the
 * original/default look; :root[data-theme="light"] = the light palette) —
 * this module only decides which one applies and remembers the choice.
 *
 * The very first thing each page's <head> does (before the stylesheet
 * loads) is re-apply a saved theme inline — see the inline script in
 * index.html — so the page never flashes dark-then-light on load; the
 * functions here keep localStorage and any toggle button in sync after that.
 */
const STORAGE_KEY = 'dani_theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const THEME_COLOR = { dark: '#110808', light: '#fbf4f3' };

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
  button.textContent = isLight ? '🌙 Tema Scuro' : '☀️ Tema Chiaro';
  button.setAttribute('aria-pressed', String(isLight));
}

/** Applies the persisted theme (defaults to dark) and wires an optional toggle button. */
export function initTheme(button) {
  applyTheme(getStoredTheme() || 'dark');

  if (!button) return;
  updateButtonLabel(button);
  button.addEventListener('click', () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    storeTheme(next);
    updateButtonLabel(button);
  });
}
