/**
 * Drag-to-resize for the widget panel. The panel's width is normally a
 * responsive clamp() driven by --right-panel-width (see styles.css, default
 * 43vw); dragging the splitter overrides that variable with an explicit
 * pixel value, which every breakpoint's clamp() already reads, so resizing
 * works the same way at any viewport width. The existing collapse button
 * (togglePanel(), Ctrl/Cmd+B) is untouched and still fully hides the panel.
 */
const STORAGE_KEY = 'editor_panel_width';
const MIN_WIDTH = 340;

function maxWidth() {
  return Math.min(900, window.innerWidth * 0.7);
}

function applyWidth(px) {
  const clamped = Math.max(MIN_WIDTH, Math.min(maxWidth(), px));
  document.documentElement.style.setProperty('--right-panel-width', clamped + 'px');
  return clamped;
}

function restoreWidth() {
  const saved = parseFloat(localStorage.getItem(STORAGE_KEY));
  if (!isNaN(saved)) applyWidth(saved);
}

export function initPanelResize() {
  const handle = document.getElementById('panelResizeHandle');
  const rightPanel = document.querySelector('.right-panel-wrap');
  if (!handle || !rightPanel) return;

  restoreWidth();

  let dragging = false;
  let startX = 0;
  let startWidth = 0;

  function onPointerMove(e) {
    if (!dragging) return;
    // The panel is the second (right) grid column, so dragging the handle
    // left (negative deltaX) should grow it.
    applyWidth(startWidth + (startX - e.clientX));
  }

  function stopDrag() {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.userSelect = '';
    try {
      localStorage.setItem(STORAGE_KEY, String(Math.round(rightPanel.getBoundingClientRect().width)));
    } catch { /* storage unavailable */ }
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDrag);
  }

  handle.addEventListener('pointerdown', e => {
    if (document.body.classList.contains('panel-collapsed')) return;
    dragging = true;
    startX = e.clientX;
    startWidth = rightPanel.getBoundingClientRect().width;
    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
    e.preventDefault();
  });

  // Double-click resets to the default responsive width.
  handle.addEventListener('dblclick', () => {
    document.documentElement.style.removeProperty('--right-panel-width');
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
  });

  // Re-clamp a saved width against the current viewport on resize (e.g. a
  // width dragged on a wide window shouldn't overflow a later, narrower one).
  window.addEventListener('resize', () => {
    const saved = parseFloat(localStorage.getItem(STORAGE_KEY));
    if (!isNaN(saved)) applyWidth(saved);
  });
}
