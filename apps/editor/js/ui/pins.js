import { $ } from '../core/dom-helpers.js';
import { escapeHtml } from '../../../../shared/js/dom-utils.js';

export const STORAGE_KEY = 'terminal_pins';
let pins = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  renderPins();
}

/** Pins the text currently in #pinInput (e.g. "120 V DC bus"). */
export function addPin() {
  const input = $('pinInput');
  const value = input.value.trim();
  if (!value) return;
  pins.push(value);
  input.value = '';
  persist();
}

export function deletePin(index) {
  pins.splice(index, 1);
  persist();
}

/** Rebuilds the #pinGrid from the in-memory list. */
export function renderPins() {
  const grid = $('pinGrid');
  grid.innerHTML = '';
  pins.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'pin-item';
    div.innerHTML = '<span>' + escapeHtml(p) + '</span><button class="pin-del">×</button>';
    div.querySelector('.pin-del').onclick = () => deletePin(i);
    grid.appendChild(div);
  });
}
