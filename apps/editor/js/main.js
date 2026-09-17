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
import { exportWorkspaceState, importWorkspaceState } from './ui/workspace-state.js';
import { updateStats, markDirty } from './ui/editor-stats.js';
import { findNext, replaceOne, replaceAll, updateFindStatus, focusFind } from './ui/find-replace.js';
import { togglePanel } from './ui/panel.js';
import { initWidgetDragDrop, resetWidgetOrder } from './ui/widget-order.js';
import { initPanelResize } from './ui/panel-resize.js';
import {
  salvaFile, salvaCome, chiudiSalvaCome, selezionaCartellaSalvataggio, confermaSalvaCome,
  apriFile, onOpenFileSelected,
  loadTargetFile, checkServer, resolveTargetFileFromHash, setTargetFilePath
} from './ui/file-io.js';
import { registerServiceWorker, initInstallPrompt } from '../../../shared/js/pwa.js';
import { initTheme } from '../../../shared/js/theme.js';

Object.assign(window, {
  salvaFile, salvaCome, chiudiSalvaCome, selezionaCartellaSalvataggio, confermaSalvaCome,
  apriFile, onOpenFileSelected,
  toggleTimer, resetTimer,
  convertUnits, swapConversion,
  addTodo,
  quickCalculate,
  setCalcMode, calcAppend, calcClear, calcBack, calcFunc, calcToggleSign, calcMemory, calcCompute,
  showEng,
  calcMotor: calcMotorUI, calcGearbox: calcGearboxUI, calcVDrop: calcVDropUI,
  calcElectrical: calcElectricalUI, calcThermal: calcThermalUI,
  openWidgetManager, closeWidgetManager, showAllWidgets, hideAllWidgets, toggleWidget, closeHelp,
  exportWorkspaceState, importWorkspaceState,
  findNext, replaceOne, replaceAll, updateFindStatus,
  togglePanel, resetWidgetOrder
});

/**
 * Keeps --app-height in sync with the space actually visible on screen.
 * Prefers visualViewport, which (unlike window.innerHeight) shrinks when a
 * mobile on-screen keyboard opens — the CSS uses this instead of 100vh so
 * panels resize above the keyboard instead of being clipped by it, and so
 * a mobile browser's toolbar showing/hiding doesn't leave dead space.
 *
 * Also subtracts the topbar's own rendered height, measured live rather
 * than guessed as a CSS constant — so every existing `calc(var(--app-height)
 * - ...)` in styles.css keeps meaning "space left for the panels" without
 * having to know or hardcode how tall the topbar is (which changes if it
 * wraps to two lines on a narrow window, or if its content changes).
 */
function adaptWorkspace() {
  const height = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  const topbar = $('editorTopbar');
  const topbarHeight = topbar ? topbar.getBoundingClientRect().height : 0;
  document.documentElement.style.setProperty('--app-height', (height - topbarHeight) + 'px');
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); salvaFile(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); focusFind(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); togglePanel(); return; }
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
    $('status').innerHTML = '> Nessun file aperto | Usa “Salva Come” per crearne uno';
  }

  renderTodos();
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

  registerServiceWorker();
  initInstallPrompt($('installBtn'));
  initTheme($('themeToggleBtn'));

  updateStats();
  $('editor').addEventListener('input', () => { markDirty(); updateStats(); });
  initWidgetDragDrop();
  initPanelResize();
}

window.addEventListener('resize', adaptWorkspace);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', adaptWorkspace);
}
window.addEventListener('orientationchange', adaptWorkspace);
window.addEventListener('load', init);
initKeyboardShortcuts();
initWidgetManagerKeyboardShortcut();
