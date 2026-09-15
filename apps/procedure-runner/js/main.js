/**
 * Bootstrap for the Test Procedure Runner.
 *
 * Like the editor app, the markup keeps its original inline `onclick`/
 * `onchange` attributes, so every handler index.html references is attached
 * to `window` here. Everything else — parsing, step rules, report text,
 * screen rendering — now lives in its own small module under logic/ or ui/.
 */
import { $ } from './core/dom-helpers.js';
import { state } from './ui/state.js';
import { onUsernameChange } from './ui/username.js';
import { closeModal, closeTab } from './ui/modal.js';
import { onFileSelected, downloadTemplate, initDropZone } from './ui/loader.js';
import { downloadXlsxTemplate } from './ui/xlsx-io.js';
import { openBuilder, closeBuilder, addBuilderRow, startFromBuilder } from './ui/builder.js';
import { checkForSavedSession, resumeSession, discardSession, saveSession } from './ui/session-storage.js';
import {
  switchTab, openCorrectionModal, onMeasuredChange, onNoteChange, prevStep, handleAction,
  openSkipModal, confirmSkip, confirmAnomaly, saveCorrection
} from './ui/execution.js';
import { backFromEnd, forceCloseProcedure } from './ui/end-screen.js';
import { exportUpdatedCsv, exportUpdatedXlsx, exportReportTxt } from './ui/export.js';
import { registerServiceWorker } from '../../../shared/js/pwa.js';

Object.assign(window, {
  onUsernameChange,
  closeModal, closeTab,
  onFileSelected, downloadTemplate, downloadXlsxTemplate,
  openBuilder, closeBuilder, addBuilderRow, startFromBuilder,
  resumeSession, discardSession,
  switchTab, openCorrectionModal, onMeasuredChange, onNoteChange, prevStep, handleAction,
  openSkipModal, confirmSkip, confirmAnomaly, saveCorrection,
  backFromEnd, forceCloseProcedure,
  exportUpdatedCsv, exportUpdatedXlsx, exportReportTxt
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
  }

  if (e.ctrlKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (state.steps.length) {
      saveSession();
      exportUpdatedCsv();
    }
  }
});

initDropZone();

window.addEventListener('load', () => {
  $('usernameField').value = state.username;
  checkForSavedSession();
  registerServiceWorker();
});
