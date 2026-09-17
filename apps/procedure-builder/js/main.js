/**
 * Bootstrap for Procedure Builder. Markup uses inline onclick/onchange
 * attributes, same convention as the other apps, so every handler
 * index.html references is attached to `window` here.
 */
import { $ } from './core/dom-helpers.js';
import {
  initBuilder, addBuilderRow, newBuilderProcedure, importIntoBuilder,
  onBuilderImportFile, exportBuilderXlsx, startInRunner, scheduleDraftSave
} from './ui/builder.js';
import { registerServiceWorker } from '../../../shared/js/pwa.js';
import { initTheme } from '../../../shared/js/theme.js';
import { mountIcons } from '../../../shared/js/dani-icons.js';
import { renderSidebar, renderHomeButton } from '../../../shared/js/sidebar.js';

Object.assign(window, {
  addBuilderRow, newBuilderProcedure, importIntoBuilder,
  onBuilderImportFile, exportBuilderXlsx, startInRunner, scheduleDraftSave
});

renderSidebar({ active: 'procedure-builder', base: '../../' });
renderHomeButton('../../');
mountIcons();
initBuilder();

window.addEventListener('load', () => {
  registerServiceWorker();
  initTheme($('themeToggleBtn'));
});
