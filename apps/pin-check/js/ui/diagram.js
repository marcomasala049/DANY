import { computeLayout } from '../logic/layout.js';
import { findPin } from '../data/connectors.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let currentConnector = null;
let currentHighlight = { a: null, b: null };

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function setPinInfo(connector, number) {
  const info = document.getElementById('pinInfo');
  if (!info) return;
  const pin = findPin(connector, number);
  if (!pin) { info.innerHTML = 'Nessun pin selezionato.'; return; }
  const parts = [];
  parts.push('<b>Pin ' + pin.number + '</b>');
  if (pin.signal) parts.push(' — ' + pin.signal);
  if (pin.function) parts.push('<br>' + pin.function);
  if (pin.notes) parts.push('<br><span class="muted">' + pin.notes + '</span>');
  info.innerHTML = parts.join('');
}

function applyHighlightClasses(wrap) {
  wrap.querySelectorAll('.pin-node').forEach(node => {
    const n = node.dataset.pin;
    node.classList.toggle('highlight-a', currentHighlight.a != null && String(currentHighlight.a) === n);
    node.classList.toggle('highlight-b', currentHighlight.b != null && String(currentHighlight.b) === n);
  });
}

/** Draws the connector's pins as an interactive SVG inside #diagramWrap. */
export function renderDiagram(connector) {
  currentConnector = connector;
  const wrap = document.getElementById('diagramWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  setPinInfo(connector, null);

  if (!connector) return;

  const svg = svgEl('svg', { viewBox: '0 0 100 100', xmlns: SVG_NS });
  const body = svgEl('rect', { x: 4, y: 4, width: 92, height: 92, rx: 6, fill: 'none', stroke: 'var(--border)', 'stroke-width': 1 });
  svg.appendChild(body);

  const positions = computeLayout(connector);
  positions.forEach(({ pin, x, y }) => {
    const g = svgEl('g', { class: 'pin-node' });
    g.dataset.pin = String(pin.number);
    const circle = svgEl('circle', { cx: x, cy: y, r: 5.4 });
    const label = svgEl('text', { x, y: y + 0.3 });
    label.textContent = pin.number;
    g.append(circle, label);

    g.addEventListener('mouseenter', () => setPinInfo(connector, pin.number));
    g.addEventListener('focus', () => setPinInfo(connector, pin.number));
    g.addEventListener('click', () => setPinInfo(connector, pin.number));
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', 'Pin ' + pin.number + (pin.signal ? ' — ' + pin.signal : ''));

    svg.appendChild(g);
  });

  wrap.appendChild(svg);
  applyHighlightClasses(wrap);
}

/** Highlights exactly two pins (a test step's Pin A / Pin B), or clears highlighting when both are null. */
export function highlightPins(pinA, pinB) {
  currentHighlight = { a: pinA, b: pinB };
  const wrap = document.getElementById('diagramWrap');
  if (wrap) applyHighlightClasses(wrap);
}

export function getCurrentConnector() {
  return currentConnector;
}
