import { $ } from '../core/dom-helpers.js';
import { nowStamp } from '../core/time.js';
import { CONNECTORS, getConnector } from '../data/connectors.js';
import { summarize, buildTxtReport } from '../logic/report.js';
import { state } from './state.js';
import { renderDiagram, highlightPins, getCurrentConnector } from './diagram.js';
import { populatePinSelects, populateMeasureTypeSelect, renderSequenceTable } from './sequence.js';
import { daniConfirm } from '../../../../shared/js/dialog.js';

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

export function renderConnectorGrid() {
  const grid = $('connectorGrid');
  if (!grid) return;
  grid.innerHTML = '';

  CONNECTORS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'connector-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.innerHTML =
      '<span class="cc-icon" data-dani-icon="connector" data-dani-size="20"></span>' +
      '<span class="cc-name">' + c.name + '</span>' +
      '<span class="cc-desc">' + (c.description || '') + '</span>' +
      '<span class="cc-count">' + c.pins.length + ' pin</span>';
    card.onclick = () => selectConnector(c.id);
    card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectConnector(c.id); } };
    grid.appendChild(card);
  });
}

export function selectConnector(id) {
  const connector = getConnector(id);
  if (!connector) return;

  if (state.connectorId !== id) {
    state.steps = [];
    state.selectedStepId = null;
  }
  state.connectorId = id;

  $('connectorTitle').textContent = connector.name;
  $('btnRestart').hidden = false;

  renderDiagram(connector);
  populatePinSelects();
  populateMeasureTypeSelect();
  renderSequenceTable();
  $('measurePanel').hidden = true;

  showScreen('screenTest');
}

export function backToSelect() {
  showScreen('screenSelect');
}

export function backToTest() {
  showScreen('screenTest');
}

export function goToEnd() {
  const connector = getCurrentConnector();
  const summary = summarize(state.steps);

  $('countPass').textContent = summary.pass;
  $('countFail').textContent = summary.fail;
  $('countPending').textContent = summary.pending;
  $('reportBox').textContent = buildTxtReport(connector, state.steps, { generatedAt: nowStamp() });

  showScreen('screenEnd');
}

export async function restartTool() {
  if (state.steps.length && !(await daniConfirm('Ricominciare? La sequenza di test corrente andrà persa.', { danger: true, okText: 'Ricomincia' }))) return;
  state.connectorId = null;
  state.steps = [];
  state.selectedStepId = null;
  $('btnRestart').hidden = true;
  highlightPins(null, null);
  showScreen('screenSelect');
}
