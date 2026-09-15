/**
 * PWA bootstrap shared by both apps: service worker registration and the
 * optional "Installa App" button. Both are no-ops where unsupported (e.g.
 * opened via file://, or a browser without install prompts), so calling
 * these never breaks the page when PWA features aren't available.
 */

/**
 * Registers the service worker at the project root — computed from this
 * module's own URL (shared/js/pwa.js, two directories below the root)
 * rather than an absolute "/..." path, so the app keeps working whether
 * it's served from a domain root or a subfolder (e.g. GitHub Pages'
 * https://user.github.io/DANY/). Resolves to null if unsupported or it fails.
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const swUrl = new URL('../../service-worker.js', import.meta.url);
    return await navigator.serviceWorker.register(swUrl);
  } catch (err) {
    console.warn('[pwa] service worker registration failed (offline support disabled):', err);
    return null;
  }
}

/**
 * Wires the browser's install prompt to a button element. The button should
 * start `hidden` in the markup — it is revealed only while an install
 * prompt is actually available, and hidden again once used or installed.
 */
export function initInstallPrompt(button) {
  if (!button) return;
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    button.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    button.hidden = true;
  });
}
