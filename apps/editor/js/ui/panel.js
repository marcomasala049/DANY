const PANEL_COLLAPSED_KEY = 'editor_panel_collapsed';

/**
 * Applies (or lifts) the collapsed state on <body> and persists it. The
 * initial state is applied even earlier, by a pre-paint inline <script> in
 * index.html (same pattern as the dani_theme no-flash script), so the
 * widget panel never visibly flashes open before collapsing.
 */
export function applyPanelCollapsed(collapsed) {
  document.body.classList.toggle('panel-collapsed', collapsed);
  try { localStorage.setItem(PANEL_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* storage unavailable */ }
}

export function togglePanel() {
  applyPanelCollapsed(!document.body.classList.contains('panel-collapsed'));
}
