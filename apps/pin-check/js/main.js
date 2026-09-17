/**
 * Bootstrap for the Pin Function Tool. Markup uses inline onclick/onchange
 * attributes, same convention as the editor and procedure-runner apps, so
 * every handler index.html references is attached to `window` here.
 */
import {
  renderConnectorGrid, selectConnector, backToSelect, backToTest, goToEnd, restartTool
} from './ui/screens.js';
import {
  onNewMeasureTypeChange, addStep, selectStep, deleteSelectedStep, saveMeasurement
} from './ui/sequence.js';
import { exportTxt, exportXlsx } from './ui/export.js';
import { registerServiceWorker, initInstallPrompt } from '../../../shared/js/pwa.js';
import { initTheme } from '../../../shared/js/theme.js';

Object.assign(window, {
  selectConnector, backToSelect, backToTest, goToEnd, restartTool,
  onNewMeasureTypeChange, addStep, selectStep, deleteSelectedStep, saveMeasurement,
  exportTxt, exportXlsx
});

function init() {
  renderConnectorGrid();
  registerServiceWorker();
  initInstallPrompt(document.getElementById('installBtn'));
  initTheme(document.getElementById('themeToggleBtn'));
}

window.addEventListener('load', init);
