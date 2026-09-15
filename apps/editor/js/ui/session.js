import { $ } from '../core/dom-helpers.js';

let sessionRunning = false;
let sessionStart = null;
let sessionId = '';
let sessionNotes = [];

export function isSessionRunning() {
  return sessionRunning;
}

export function getSessionId() {
  return sessionId;
}

/** Appends a timestamped line to the session log (no-op when no session is running). */
export function appendSession(text) {
  if (!sessionRunning) return;
  sessionNotes.push(text);
  const log = $('sessionLog');
  log.innerText += '\n' + text;
  log.scrollTop = log.scrollHeight;
}

export function startSession() {
  if (sessionRunning) return;
  sessionRunning = true;
  sessionStart = new Date();
  sessionId = 'TEST_' +
    sessionStart.getFullYear() +
    String(sessionStart.getMonth() + 1).padStart(2, '0') +
    String(sessionStart.getDate()).padStart(2, '0') + '_' +
    String(sessionStart.getHours()).padStart(2, '0') +
    String(sessionStart.getMinutes()).padStart(2, '0') +
    String(sessionStart.getSeconds()).padStart(2, '0');
  sessionNotes = [];

  $('sessionHeader').innerText = '● ' + sessionId + ' RUNNING';
  $('sessionState').innerText = '● RUNNING';
  $('sessionLog').innerText = 'START ' + sessionStart.toLocaleString('it-IT');
}

export function logSessionNote() {
  if (!sessionRunning) { alert('Avvia prima la sessione.'); return; }
  const note = prompt('Nota test:');
  if (note) appendSession(new Date().toLocaleTimeString('it-IT') + '  ' + note);
}

export function stopSession() {
  if (!sessionRunning) return;
  appendSession('STOP ' + new Date().toLocaleString('it-IT'));
  sessionRunning = false;
  $('sessionHeader').innerText = '● ' + sessionId + ' STOPPED';
  $('sessionState').innerText = 'IDLE';
}
