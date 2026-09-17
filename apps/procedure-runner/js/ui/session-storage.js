import { $ } from '../core/dom-helpers.js';
import { escapeHtml } from '../../../../shared/js/dom-utils.js';
import { findFirstUnsigned } from '../logic/steps.js';
import { state } from './state.js';
import { enterExecution } from './execution.js';
import { daniAlert, daniConfirm } from '../../../../shared/js/dialog.js';

export const SESSION_KEY = 'procrunner_session';

/** Persists the in-progress run so it can be resumed after an accidental close. */
export function saveSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      steps: state.steps,
      currentIndex: state.currentIndex,
      sourceName: state.sourceName,
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('Impossibile salvare la sessione:', e);
  }
}

/** Shows the "resume?" box on the load screen when a saved session exists. */
export function checkForSavedSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;

  try {
    const s = JSON.parse(raw);
    if (s && s.steps && s.steps.length) {
      $('resumeBox').style.display = 'block';

      const total = s.steps.length;
      const done = s.steps.filter(x => (x.signature && x.signature.trim()) || (x.skipReason && x.skipReason.trim())).length;
      const savedDate = s.savedAt ? new Date(s.savedAt).toLocaleString('it-IT') : '—';

      $('resumeInfo').innerHTML =
        'File: <b>' + escapeHtml(s.sourceName || 'senza nome') +
        '</b> — ' + done + '/' + total +
        ' step compilati — salvata il ' + escapeHtml(savedDate);
    }
  } catch (e) {
    localStorage.removeItem(SESSION_KEY);
  }
}

export async function resumeSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;

  try {
    const s = JSON.parse(raw);

    state.steps = s.steps || [];
    state.currentIndex = Number.isInteger(s.currentIndex) ? s.currentIndex : findFirstUnsigned(state.steps);
    state.sourceName = s.sourceName || 'procedura.csv';

    if (!state.steps.length) { await discardSession(); return; }

    enterExecution();
  } catch (e) {
    await daniAlert('La sessione salvata non è leggibile.');
    localStorage.removeItem(SESSION_KEY);
  }
}

export async function discardSession() {
  if (!(await daniConfirm('Eliminare la sessione salvata? L\'operazione non è reversibile.', { danger: true, okText: 'Elimina' }))) return;
  localStorage.removeItem(SESSION_KEY);
  $('resumeBox').style.display = 'none';
}
