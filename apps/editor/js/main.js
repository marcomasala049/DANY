/**
 * Bootstrap for the Terminal Workspace editor.
 *
 * The markup still uses inline `onclick`/`onchange` attributes (over 60 of
 * them) exactly as the original single-file app did, so every handler used
 * by index.html is attached to `window` here. That keeps this refactor a
 * pure reorganization — same markup, same behavior — while every piece of
 * logic now lives in its own small, independently testable module.
 */
import { $ } from './core/dom-helpers.js';
import { startClock } from './ui/clock.js';
import { toggleTimer, resetTimer } from './ui/timer.js';
import { convertUnits, swapConversion } from './ui/converter.js';
import { addTodo, renderTodos } from './ui/todo.js';
import { addPin, renderPins } from './ui/pins.js';
import { quickCalculate } from './ui/quick-calculator.js';
import {
  setCalcMode, calcAppend, calcClear, calcBack, calcFunc, calcToggleSign, calcMemory, calcCompute
} from './ui/calculator.js';
import {
  showEng, calcMotorUI, calcGearboxUI, calcVDropUI, calcElectricalUI, calcThermalUI
} from './ui/engineering.js';
import { renderFormulas } from './ui/formulas.js';
import {
  openWidgetManager, closeWidgetManager, showAllWidgets, hideAllWidgets, toggleWidget,
  restoreWidgetStates, applyWidgetVisibility, addHelpButtons, openHelp, closeHelp,
  initWidgetManagerKeyboardShortcut
} from './ui/widgets.js';
import { startSession, logSessionNote, stopSession } from './ui/session.js';
import { checkThreshold } from './ui/threshold.js';
import { addProcedureStep, renderProcedure, exportProcedureReport } from './ui/procedure.js';
import { inspectData, reinspectData, renderData, exportCleanCsv, drawDataChart, initChartResize } from './ui/data-inspector.js';
import { exportWorkspaceState, importWorkspaceState } from './ui/workspace-state.js';
import {
  salvaFile, salvaCome, chiudiSalvaCome, selezionaCartellaSalvataggio, confermaSalvaCome,
  loadTargetFile, checkServer, resolveTargetFileFromHash, setTargetFilePath
} from './ui/file-io.js';
import { registerServiceWorker, initInstallPrompt } from '../../../shared/js/pwa.js';
import { initTheme } from '../../../shared/js/theme.js';

Object.assign(window, {
  salvaFile, salvaCome, chiudiSalvaCome, selezionaCartellaSalvataggio, confermaSalvaCome,
  toggleTimer, resetTimer,
  convertUnits, swapConversion,
  addTodo, addPin,
  quickCalculate,
  setCalcMode, calcAppend, calcClear, calcBack, calcFunc, calcToggleSign, calcMemory, calcCompute,
  showEng,
  calcMotor: calcMotorUI, calcGearbox: calcGearboxUI, calcVDrop: calcVDropUI,
  calcElectrical: calcElectricalUI, calcThermal: calcThermalUI,
  openWidgetManager, closeWidgetManager, showAllWidgets, hideAllWidgets, toggleWidget, closeHelp,
  startSession, logSessionNote, stopSession,
  checkThreshold,
  addProcedureStep, exportProcedureReport,
  inspectData, reinspectData, renderData, exportCleanCsv, drawDataChart,
  exportWorkspaceState, importWorkspaceState
});

/**
 * Keeps --app-height in sync with the space actually visible on screen.
 * Prefers visualViewport, which (unlike window.innerHeight) shrinks when a
 * mobile on-screen keyboard opens — the CSS uses this instead of 100vh so
 * panels resize above the keyboard instead of being clipped by it, and so
 * a mobile browser's toolbar showing/hiding doesn't leave dead space.
 */
function adaptWorkspace() {
  const height = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', height + 'px');
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); salvaFile(); return; }
    if (e.key === 'Escape' && $('helpModal').classList.contains('show')) { closeHelp(); return; }

    if (document.activeElement === $('editor') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    if ('0123456789.+-*/'.includes(e.key)) calcAppend(e.key);
    else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calcCompute(); }
    else if (e.key.toLowerCase() === 'c') calcClear();
    else if (e.key === 'Backspace') calcBack();
  });
}

function init() {
  adaptWorkspace();

  const targetFilePath = resolveTargetFileFromHash();
  if (targetFilePath) {
    setTargetFilePath(targetFilePath);
    $('file-label').innerText = targetFilePath;
    loadTargetFile(targetFilePath);
  } else {
    $('file-label').innerText = 'Nessun file collegato — pronto per creare un .txt';
    $('status').innerHTML = '> Nessun file aperto | Usa “Salva come nuovo .txt” per crearne uno';
  }

  renderTodos();
  renderPins();
  renderProcedure();
  renderFormulas();
  addHelpButtons();
  startClock();
  convertUnits();
  calcMotorUI();
  calcGearboxUI();
  calcVDropUI();
  calcElectricalUI();
  calcThermalUI();
  restoreWidgetStates();
  applyWidgetVisibility();
  checkServer();
  checkThreshold();

  registerServiceWorker();
  initInstallPrompt($('installBtn'));
  initChartResize();
  initTheme($('themeToggleBtn'));
}

window.addEventListener('resize', adaptWorkspace);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', adaptWorkspace);
}
window.addEventListener('orientationchange', adaptWorkspace);
window.addEventListener('load', init);
initKeyboardShortcuts();
initWidgetManagerKeyboardShortcut();
