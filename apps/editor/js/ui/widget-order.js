import { widgetKeyFromTitle } from '../logic/widget-storage-keys.js';
import { WIDGET_ORDER_KEY, sortIdsByOrder } from '../logic/widget-order.js';

let dragEl = null;

function getWidgetSection(widget) {
  let el = widget.previousElementSibling;
  while (el) {
    if (el.classList.contains('group-label')) return el;
    el = el.previousElementSibling;
  }
  return null;
}

function getWidgetId(widget) {
  const title = widget.querySelector('.title-text');
  return title ? widgetKeyFromTitle(title.textContent || '') : '';
}

function clearDropMarkers() {
  document.querySelectorAll('.right-panel>.widget.drop-before,.right-panel>.widget.drop-after')
    .forEach(el => el.classList.remove('drop-before', 'drop-after'));
}

function saveWidgetOrder() {
  const panel = document.querySelector('.right-panel');
  if (!panel) return;
  const ids = Array.from(panel.querySelectorAll(':scope > .widget')).map(getWidgetId).filter(Boolean);
  try { localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
}

/** Reorders each group's widgets in the DOM to match the saved order, if any. */
function applyWidgetOrder() {
  const panel = document.querySelector('.right-panel');
  if (!panel) return;
  let order;
  try { order = JSON.parse(localStorage.getItem(WIDGET_ORDER_KEY) || 'null'); } catch { /* ignore */ }
  if (!Array.isArray(order) || !order.length) return;

  const reorderSection = widgets => {
    const ids = widgets.map(getWidgetId);
    const sortedIds = sortIdsByOrder(ids, order);
    const byId = new Map(widgets.map(w => [getWidgetId(w), w]));
    return sortedIds.map(id => byId.get(id)).filter(Boolean);
  };

  const labels = Array.from(panel.querySelectorAll(':scope > .group-label'));
  if (!labels.length) {
    reorderSection(Array.from(panel.querySelectorAll(':scope > .widget'))).forEach(w => panel.appendChild(w));
    return;
  }

  labels.forEach((label, i) => {
    const next = labels[i + 1] || null;
    const section = [];
    let el = label.nextElementSibling;
    while (el && el !== next) { if (el.classList.contains('widget')) section.push(el); el = el.nextElementSibling; }
    let anchor = label;
    reorderSection(section).forEach(w => { anchor.after(w); anchor = w; });
  });
}

/** "↺ RESET ORDINE" in the widget manager: drops the saved order and reloads. */
export function resetWidgetOrder() {
  if (!confirm("Ripristinare l'ordine originale dei widget?")) return;
  try { localStorage.removeItem(WIDGET_ORDER_KEY); } catch { /* ignore */ }
  location.reload();
}

/** Wires drag handles on every widget and applies any previously saved order. */
export function initWidgetDragDrop() {
  const panel = document.querySelector('.right-panel');
  if (!panel) return;

  panel.querySelectorAll(':scope > .widget').forEach(widget => {
    if (widget.dataset.dndReady) return;
    widget.dataset.dndReady = '1';

    const title = widget.querySelector('.widget-title');
    if (!title) return;

    if (!title.querySelector('.drag-handle')) {
      const handle = document.createElement('span');
      handle.className = 'drag-handle';
      handle.textContent = '⋮⋮';
      handle.title = 'Trascina per riordinare';
      handle.setAttribute('aria-hidden', 'true');
      title.insertBefore(handle, title.firstChild);
      handle.addEventListener('mousedown', e => { e.stopPropagation(); widget.draggable = true; });
      handle.addEventListener('mouseup', () => { widget.draggable = false; });
      handle.addEventListener('mouseleave', () => { widget.draggable = false; });
      handle.addEventListener('click', e => e.stopPropagation());
      handle.addEventListener('touchstart', () => { widget.draggable = true; }, { passive: true });
      handle.addEventListener('touchend', () => { widget.draggable = false; });
    }

    widget.addEventListener('dragstart', e => {
      if (!widget.draggable) { e.preventDefault(); return; }
      dragEl = widget;
      widget.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', getWidgetId(widget)); } catch { /* ignore */ }
    });
    widget.addEventListener('dragend', () => {
      widget.classList.remove('dragging');
      widget.draggable = false;
      clearDropMarkers();
      if (dragEl) { saveWidgetOrder(); dragEl = null; }
    });
    widget.addEventListener('dragover', e => {
      if (!dragEl || dragEl === widget) return;
      if (getWidgetSection(dragEl) !== getWidgetSection(widget)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = widget.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      clearDropMarkers();
      widget.classList.add(before ? 'drop-before' : 'drop-after');
    });
    widget.addEventListener('dragleave', e => {
      if (widget.contains(e.relatedTarget)) return;
      widget.classList.remove('drop-before', 'drop-after');
    });
    widget.addEventListener('drop', e => {
      if (!dragEl || dragEl === widget) return;
      if (getWidgetSection(dragEl) !== getWidgetSection(widget)) return;
      e.preventDefault();
      const before = widget.classList.contains('drop-before');
      if (before) widget.parentNode.insertBefore(dragEl, widget);
      else widget.parentNode.insertBefore(dragEl, widget.nextSibling);
      clearDropMarkers();
    });
  });

  applyWidgetOrder();
}
