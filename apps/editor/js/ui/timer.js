import { $ } from '../core/dom-helpers.js';

let timerSeconds = 0;
let timerRunning = false;
let timerHandle = null;

function updateTimerDisplay() {
  const h = String(Math.floor(timerSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(timerSeconds % 60).padStart(2, '0');
  $('timerDisplay').innerText = `${h}:${m}:${s}`;
}

/** Starts/pauses the "TEST TIMER" stopwatch shown next to the editor controls. */
export function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerHandle);
    timerRunning = false;
    $('timerBtn').innerText = 'START';
  } else {
    timerRunning = true;
    $('timerBtn').innerText = 'PAUSE';
    timerHandle = setInterval(() => { timerSeconds++; updateTimerDisplay(); }, 1000);
  }
}

/** Resets the stopwatch to 00:00:00 and stops it. */
export function resetTimer() {
  clearInterval(timerHandle);
  timerRunning = false;
  timerSeconds = 0;
  updateTimerDisplay();
  $('timerBtn').innerText = 'START';
}
