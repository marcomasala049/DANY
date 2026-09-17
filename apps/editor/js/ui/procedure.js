import { $ } from '../core/dom-helpers.js';
import { escapeHtml } from '../../../../shared/js/dom-utils.js';
import { isSessionRunning, getSessionId, appendSession } from './session.js';

export const STORAGE_KEY = 'terminal_procedure';
let procedureSteps = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(procedureSteps));
  renderProcedure();
}

export function addProcedureStep() {
  const input = $('procInput');
  const text = input.value.trim();
  if (!text) return;
  procedureSteps.push({ text, status: 'pending', note: '' });
  input.value = '';
  persist();
}

export function setStepStatus(index, status) {
  procedureSteps[index].status = procedureSteps[index].status === status ? 'pending' : status;
  persist();
}

export function updateStepNote(index, note) {
  procedureSteps[index].note = note;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(procedureSteps));
}

export function deleteStep(index, event) {
  event.stopPropagation();
  procedureSteps.splice(index, 1);
  persist();
}

export function renderProcedure() {
  const list = $('procList');
  list.innerHTML = '';

  if (!procedureSteps.length) {
    list.innerHTML = '<li style="color:var(--text-tertiary);text-align:center;font-size:.72em;padding:4px">Nessuno step. Aggiungi una procedura di test.</li>';
  }

  procedureSteps.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'proc-item proc-' + s.status;
    li.innerHTML =
      '<div class="proc-row1"><span class="proc-idx">' + (i + 1) + '.</span>' +
      '<span class="proc-text">' + escapeHtml(s.text) + '</span>' +
      '<button class="todo-del" data-del>×</button></div>' +
      '<div class="proc-row2">' +
      '<button data-st="pass" class="proc-btn pass' + (s.status === 'pass' ? ' active' : '') + '">PASS</button>' +
      '<button data-st="fail" class="proc-btn fail' + (s.status === 'fail' ? ' active' : '') + '">FAIL</button>' +
      '<button data-st="na" class="proc-btn na' + (s.status === 'na' ? ' active' : '') + '">N/A</button>' +
      '<input class="proc-note" placeholder="nota..." value="' + escapeHtml(s.note || '') + '"></div>';

    li.querySelector('[data-del]').onclick = e => deleteStep(i, e);
    li.querySelectorAll('.proc-btn').forEach(b => { b.onclick = () => setStepStatus(i, b.dataset.st); });
    li.querySelector('.proc-note').oninput = e => updateStepNote(i, e.target.value);
    list.appendChild(li);
  });

  const total = procedureSteps.length;
  const pass = procedureSteps.filter(s => s.status === 'pass').length;
  const fail = procedureSteps.filter(s => s.status === 'fail').length;
  const na = procedureSteps.filter(s => s.status === 'na').length;
  const pending = total - pass - fail - na;

  $('procSummary').innerText = total
    ? pass + '/' + total + ' PASS · ' + fail + ' FAIL · ' + na + ' N/A · ' + pending + ' pending'
    : '';
}

/** Downloads a timestamped .txt report of the current checklist. */
export function exportProcedureReport() {
  if (!procedureSteps.length) { alert('Nessuno step da esportare.'); return; }

  const sessionId = getSessionId();
  let out = 'PROCEDURA DI TEST — ' + new Date().toLocaleString('it-IT') + '\n';
  if (sessionId) out += 'Sessione: ' + sessionId + '\n';
  out += '\n';
  procedureSteps.forEach((s, i) => {
    out += (i + 1) + '. [' + s.status.toUpperCase() + '] ' + s.text + (s.note ? ' — ' + s.note : '') + '\n';
  });

  const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'test_report_' + (sessionId || Date.now()) + '.txt';
  a.click();
  URL.revokeObjectURL(a.href);

  if (isSessionRunning()) appendSession('EXPORT REPORT ' + new Date().toLocaleTimeString('it-IT'));
}
