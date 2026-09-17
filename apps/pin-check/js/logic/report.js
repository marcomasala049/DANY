/**
 * Pure report/export builders — steps + connector data in, plain text or a
 * row-array out. No DOM, no Date.now() (the caller passes a timestamp), so
 * this is fully unit-testable; ui/export.js just hands the result to a
 * Blob download or an ExcelJS worksheet.
 */
import { getMeasureType } from '../data/measure-types.js';
import { findPin } from '../data/connectors.js';

/** Pass/fail/pending counts for the end-screen summary cards. */
export function summarize(steps) {
  const pass = steps.filter(s => s.result === 'pass').length;
  const fail = steps.filter(s => s.result === 'fail').length;
  return { pass, fail, pending: steps.length - pass - fail };
}

export const EXPORT_COLUMNS = [
  'Connettore', 'Data/Ora', 'N.', 'Pin A', 'Pin B', 'Segnale/Funzione A', 'Segnale/Funzione B',
  'Tipo Misura', 'Valore Misurato', 'Unità', 'Valore Atteso', 'Tolleranza', 'Esito', 'Note'
];

function pinDescription(connector, number) {
  const pin = findPin(connector, number);
  if (!pin) return '';
  return [pin.signal, pin.function].filter(Boolean).join(' — ');
}

function resultLabel(result) {
  return result === 'pass' ? 'PASS' : result === 'fail' ? 'FAIL' : '';
}

/** One export row (array of cell values, matching EXPORT_COLUMNS) for a single measurement. */
export function stepToRow(connector, step, index) {
  const mt = getMeasureType(step.measureTypeId);
  return [
    connector ? connector.name : '',
    step.measuredAt || '',
    index,
    step.pinA,
    step.pinB,
    pinDescription(connector, step.pinA),
    pinDescription(connector, step.pinB),
    mt ? mt.label : (step.measureTypeId || ''),
    step.measuredValue || '',
    mt ? mt.unit : '',
    step.expectedValue || '',
    step.tolerance || '',
    resultLabel(step.result),
    step.notes || ''
  ];
}

/** Header row + one row per step, ready to write straight into a CSV/XLSX sheet. */
export function buildExportRows(connector, steps) {
  return [EXPORT_COLUMNS, ...steps.map((s, i) => stepToRow(connector, s, i + 1))];
}

/** Full human-readable .txt report for the current connector/session. */
export function buildTxtReport(connector, steps, { generatedAt } = {}) {
  const pass = steps.filter(s => s.result === 'pass').length;
  const fail = steps.filter(s => s.result === 'fail').length;

  let out = '';
  out += '=======================================================================\n';
  out += '         REPORT VERIFICA ELETTRICA CONNETTORE — PIN FUNCTION TOOL\n';
  out += '=======================================================================\n\n';
  out += 'Connettore:    ' + (connector ? connector.name : '—') + '\n';
  out += 'Generato il:   ' + (generatedAt || '') + '\n';
  out += 'Misure totali: ' + steps.length + '\n';
  out += 'PASS: ' + pass + '   FAIL: ' + fail + '   Non valutate: ' + (steps.length - pass - fail) + '\n\n';

  out += '=======================================================================\n';
  out += '                          DETTAGLIO MISURE\n';
  out += '=======================================================================\n';

  steps.forEach((s, i) => {
    const mt = getMeasureType(s.measureTypeId);
    const unit = mt && mt.unit ? ' ' + mt.unit : '';
    const descA = pinDescription(connector, s.pinA);
    const descB = pinDescription(connector, s.pinB);

    out += '-----------------------------------------------------------------------\n';
    out += (i + 1) + '. Pin ' + s.pinA + ' ↔ Pin ' + s.pinB;
    if (descA || descB) out += '  (' + [descA, descB].filter(Boolean).join(' / ') + ')';
    out += '\n';
    out += '   Tipo misura:     ' + (mt ? mt.label : (s.measureTypeId || '—')) + '\n';
    out += '   Valore misurato: ' + (s.measuredValue || '—') + unit + '\n';
    if (s.expectedValue) out += '   Valore atteso:   ' + s.expectedValue + unit + '\n';
    if (s.tolerance) out += '   Tolleranza:      ' + s.tolerance + '\n';
    if (s.result) out += '   Esito:           ' + resultLabel(s.result) + '\n';
    if (s.notes) out += '   Note:            ' + s.notes + '\n';
    out += '\n';
  });

  if (!steps.length) out += '(Nessuna misura registrata.)\n';

  return out;
}
