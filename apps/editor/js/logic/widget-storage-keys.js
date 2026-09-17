/**
 * Pure key-derivation helpers for widget show/hide and collapse state.
 * The actual reads/writes against localStorage live in ui/widgets.js.
 */

export const WIDGET_VISIBILITY_PREFIX = 'widget_visibility';

/**
 * Strips a leading decorative icon (widget titles are prefixed with an emoji,
 * e.g. "🕐 Sistema Orario") and a trailing " DEG"/" RAD" suffix (the
 * calculator's dynamic title) to get a stable key independent of both.
 */
export function widgetKeyFromTitle(title) {
  return title.replace(/^[^\p{L}]+/u, '').replace(/\s+(DEG|RAD)$/, '').trim();
}

/** Turns a widget title into a safe localStorage key. */
export function widgetStorageKey(title) {
  return WIDGET_VISIBILITY_PREFIX + '_' +
    title.toLowerCase().replace(/[^a-z0-9àèéìòù]+/gi, '_').replace(/^_|_$/g, '');
}
