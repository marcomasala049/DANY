import { $ } from '../core/dom-helpers.js';
import { escapeHtml } from '../../../../shared/js/dom-utils.js';
import { daniIcon } from '../../../../shared/js/dani-icons.js';
import { MEASURE_TYPE_LIST, getMeasureType } from '../data/measure-types.js';
import { findPin } from '../data/connectors.js';
import { evaluateResult } from '../logic/measurement.js';
import { nowStamp } from '../core/time.js';
import { state, nextId } from './state.js';
import { getCurrentConnector, highlightPins } from './diagram.js';

/** Fills the Pin A / Pin B selects on the "add step" form from the current connector's pins. */
export function populatePinSelects() {
  const connector = getCurrentConnector();
  const a = $('newPinA'), b = $('newPinB');
  if (!a || !b || !connector) return;
  const options = connector.pins.map(p => '<option value="' + p.number + '">Pin ' + p.number + (p.signal ? ' — ' + p.signal : '') + '</option>').join('');
  a.innerHTML = options;
  b.innerHTML = options;
  if (connector.pins[1]) b.value = connector.pins[1].number;
}

export function populateMeasureTypeSelect() {
  const sel = $('newMeasureType');
  if (!sel) return;
  sel.innerHTML = MEASURE_TYPE_LIST.map(mt => '<option value="' + mt.id + '">' + mt.label + (mt.unit ? ' (' + mt.unit + ')' : '') + '</option>').join('');
}

/** No-op hook kept for the form's onchange — reserved for future per-type UI tweaks. */
export function onNewMeasureTypeChange() { /* intentionally empty for now */ }

export function addStep() {
  const connector = getCurrentConnector();
  if (!connector) return;

  const pinA = $('newPinA').value;
  const pinB = $('newPinB').value;
  if (!pinA || !pinB) { alert('Seleziona entrambi i pin.'); return; }
  if (pinA === pinB) { alert('Pin A e Pin B devono essere diversi.'); return; }

  state.steps.push({
    id: nextId(),
    pinA, pinB,
    measureTypeId: $('newMeasureType').value,
    expectedValue: $('newExpected').value.trim(),
    tolerance: $('newTolerance').value.trim(),
    notes: $('newNotes').value.trim(),
    measuredValue: '',
    measuredAt: '',
    result: null
  });

  $('newExpected').value = '';
  $('newTolerance').value = '';
  $('newNotes').value = '';

  renderSequenceTable();
}

function resultBadge(result) {
  if (result === 'pass') return '<span class="result-pass">' + daniIcon('pass', { size: 13 }) + '<span>PASS</span></span>';
  if (result === 'fail') return '<span class="result-fail">' + daniIcon('fail', { size: 13 }) + '<span>FAIL</span></span>';
  return '<span class="result-pending">—</span>';
}

export function renderSequenceTable() {
  const body = $('sequenceBody');
  if (!body) return;
  body.innerHTML = '';

  state.steps.forEach((s, i) => {
    const tr = document.createElement('tr');
    tr.className = s.id === state.selectedStepId ? 'selected' : '';

    const tdIdx = document.createElement('td');
    tdIdx.textContent = i + 1;

    const tdPins = document.createElement('td');
    tdPins.textContent = 'Pin ' + s.pinA + ' ↔ Pin ' + s.pinB;

    const mt = getMeasureType(s.measureTypeId);
    const tdType = document.createElement('td');
    tdType.textContent = mt ? mt.label : s.measureTypeId;

    const tdResult = document.createElement('td');
    tdResult.innerHTML = resultBadge(s.result);

    const tdDel = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'step-del';
    delBtn.textContent = '×';
    delBtn.title = 'Elimina step';
    delBtn.onclick = e => { e.stopPropagation(); deleteStep(s.id); };
    tdDel.appendChild(delBtn);

    tr.append(tdIdx, tdPins, tdType, tdResult, tdDel);
    tr.onclick = () => selectStep(s.id);
    body.appendChild(tr);
  });

  $('stepCount').textContent = state.steps.length;

  if (!state.steps.find(s => s.id === state.selectedStepId)) {
    state.selectedStepId = null;
    $('measurePanel').hidden = true;
    highlightPins(null, null);
  }
}

export function selectStep(id) {
  state.selectedStepId = id;
  const step = state.steps.find(s => s.id === id);
  renderSequenceTable();
  if (!step) return;

  highlightPins(step.pinA, step.pinB);
  renderMeasurePanel(step);
}

export function deleteStep(id) {
  state.steps = state.steps.filter(s => s.id !== id);
  if (state.selectedStepId === id) state.selectedStepId = null;
  renderSequenceTable();
  $('measurePanel').hidden = true;
  highlightPins(null, null);
}

export function deleteSelectedStep() {
  if (state.selectedStepId != null) deleteStep(state.selectedStepId);
}

function pinLabel(connector, number) {
  const pin = findPin(connector, number);
  if (!pin) return 'Pin ' + number;
  return 'Pin ' + number + (pin.signal ? ' (' + pin.signal + ')' : '');
}

function renderMeasurePanel(step) {
  const connector = getCurrentConnector();
  const panel = $('measurePanel');
  panel.hidden = false;

  $('measureStepNum').textContent = state.steps.findIndex(s => s.id === step.id) + 1;

  const mt = getMeasureType(step.measureTypeId);
  $('measureSummary').innerHTML =
    '<b>' + pinLabel(connector, step.pinA) + ' ↔ ' + pinLabel(connector, step.pinB) + '</b><br>' +
    'Tipo misura: ' + escapeHtml(mt ? mt.label : step.measureTypeId) +
    (step.expectedValue ? ' — Atteso: ' + escapeHtml(step.expectedValue) + (mt && mt.unit ? ' ' + mt.unit : '') : '') +
    (step.tolerance ? ' ± ' + escapeHtml(step.tolerance) : '');

  $('measureValueLabel').textContent = 'Valore Misurato' + (mt && mt.unit ? ' (' + mt.unit + ')' : '');

  const inputWrap = $('measureValueInputWrap');
  inputWrap.innerHTML = '';
  if (mt && mt.inputType === 'select') {
    const select = document.createElement('select');
    select.id = 'measureValueField';
    select.innerHTML = '<option value="">-- seleziona --</option>' + mt.options.map(o => '<option value="' + o + '">' + o + '</option>').join('');
    select.value = step.measuredValue || '';
    inputWrap.appendChild(select);
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'measureValueField';
    input.placeholder = 'es. 123.4';
    input.value = step.measuredValue || '';
    inputWrap.appendChild(input);
  }

  $('measureResult').innerHTML = step.result ? resultBadge(step.result) : '';
}

export function saveMeasurement() {
  const step = state.steps.find(s => s.id === state.selectedStepId);
  if (!step) return;

  const field = $('measureValueField');
  const value = field ? field.value.trim() : '';
  if (!value) { alert('Inserisci un valore misurato.'); return; }

  step.measuredValue = value;
  step.measuredAt = nowStamp();
  const mt = getMeasureType(step.measureTypeId);
  step.result = evaluateResult(mt, value, step.expectedValue, step.tolerance);

  renderSequenceTable();
  renderMeasurePanel(step);
}
