import { $ } from '../core/dom-helpers.js';

/** Compares #thCurrent against warning/alarm limits and updates the status line. */
export function checkThreshold() {
  const current = +$('thCurrent').value;
  const warnLimit = +$('thWarn').value;
  const alarmLimit = +$('thAlarm').value;
  const status = $('thresholdStatus');

  status.classList.remove('alarm');
  if (current >= alarmLimit) {
    status.innerText = '🔴 ALARM — Current ' + current + ' A';
    status.classList.add('alarm');
  } else if (current >= warnLimit) {
    status.innerText = '⚠ WARNING — Current ' + current + ' A';
  } else {
    status.innerText = '● NORMAL — Current ' + current + ' A';
  }
}
