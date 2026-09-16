/**
 * Pure helpers behind widget drag-and-drop reordering. DOM manipulation
 * (drag events, insertion) and localStorage reads/writes live in
 * ui/widget-order.js.
 */

export const WIDGET_ORDER_KEY = 'editor_widget_order';

/**
 * Sorts `ids` (current DOM order) according to `savedOrder` (an array of
 * ids captured after a previous drag-and-drop). Ids present in savedOrder
 * come first, in that order; ids absent from it (e.g. a widget added since
 * the order was saved) keep their relative position at the end, thanks to
 * Array#sort's stability.
 */
export function sortIdsByOrder(ids, savedOrder) {
  if (!Array.isArray(savedOrder) || !savedOrder.length) return ids.slice();
  const rank = new Map(savedOrder.map((id, i) => [id, i]));
  const rankOf = id => (rank.has(id) ? rank.get(id) : 9999);
  return ids.slice().sort((a, b) => rankOf(a) - rankOf(b));
}
