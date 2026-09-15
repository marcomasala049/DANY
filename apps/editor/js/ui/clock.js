import { $ } from '../core/dom-helpers.js';

/** Refreshes the "Sistema Orario" widget with the current local time/date. */
export function updateClock() {
  const now = new Date();
  $('clockTime').innerText = now.toLocaleTimeString('it-IT');
  $('clockDate').innerText = now
    .toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    .toUpperCase();
}

/** Starts the clock and keeps it updated every second. */
export function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}
