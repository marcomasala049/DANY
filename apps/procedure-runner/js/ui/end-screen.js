import { $ } from '../core/dom-helpers.js';
import { summarizeSteps } from '../logic/steps.js';
import { buildEndScreenReport } from '../logic/report.js';
import { state } from './state.js';
import { SESSION_KEY } from './session-storage.js';
import { showScreen, switchTab, renderStep, updateProgress } from './execution.js';
import { exportUpdatedCsv } from './export.js';
import { daniAlert } from '../../../../shared/js/dialog.js';

export function evaluateEnd() {
  const summary = summarizeSteps(state.steps);

  $('countSigned').innerText = summary.countSigned;
  $('countSkipped').innerText = summary.countSkipped;
  $('countModified').innerText = summary.countModified;
  $('reportBox').innerText = buildEndScreenReport(summary);

  showScreen('screenEnd');
  updateProgress();
}

export function backFromEnd() {
  if (!state.steps.length) return;
  state.currentIndex = Math.max(0, state.steps.length - 1);
  showScreen('screenExec');
  switchTab('exec');
  renderStep();
}

export async function forceCloseProcedure() {
  await exportUpdatedCsv();
  localStorage.removeItem(SESSION_KEY);
  await daniAlert('CSV esportato. La sessione salvata è stata rimossa. Puoi chiudere questa scheda quando vuoi.');
}
