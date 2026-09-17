/**
 * Recognizes procedure columns regardless of language (Italian/English) or
 * order, for both CSV and XLSX sources.
 */
/** Canonical column order used by every CSV/XLSX template and export. */
export const PROCEDURE_COLUMNS = [
  'Step', 'Descrizione', 'Atteso', 'Misurato', 'Note', 'Immagine',
  'Timestamp', 'Firma', 'Correzione', 'Anomalia', 'MotivoSalto'
];

/** Sample data rows shown in the downloadable CSV/XLSX templates (Step..MotivoSalto order). */
export const PROCEDURE_SAMPLE_ROWS = [
  ['1', 'Verificare tensione di bus a vuoto', '120', '', '', '', '', '', '', '', ''],
  ['2', 'Misurare corrente di assorbimento a pieno carico con motore a 1920 RPM', '8.5', '', '', '', '', '', '', '', ''],
  ['3', 'Controllo visivo cablaggio e serraggio morsettiera', 'Conforme', '', '', '', '', '', '', '', '']
];

export const COLMAP = {
  step: ['step', 'passo', 'n', 'numero', 'step #'],
  desc: ['descrizione', 'description', 'desc', 'step description'],
  expected: ['atteso', 'expected', 'requisito', 'expected value'],
  measured: ['misurato', 'measured', 'valore', 'measured value'],
  notes: ['note', 'notes', 'remarks', 'osservazioni'],
  image: ['immagine', 'image', 'imageurl', 'immagine(url)', 'img'],
  timestamp: ['timestamp', 'data', 'time'],
  signature: ['firma', 'signature'],
  correction: ['correzione', 'correction'],
  anomaly: ['anomalia', 'anomaly'],
  skipReason: ['motivosalto', 'skipreason', 'salto']
};

/** Maps a header row to {columnKey: columnIndex}, -1 when a column is absent. */
export function mapHeader(headerRow) {
  const norm = h => h.toLowerCase().trim();
  const idx = {};

  Object.keys(COLMAP).forEach(key => {
    idx[key] = -1;
    headerRow.forEach((h, i) => {
      if (COLMAP[key].includes(norm(h))) idx[key] = i;
    });
  });

  return idx;
}

/**
 * Builds one step object from a raw values row using a header index map.
 * Shared by the CSV and XLSX loaders so both parse rows identically.
 * @param {number} ordinal 1-based position to fall back to when the Step column is blank.
 */
export function extractStep(idx, values, ordinal) {
  const get = key => (idx[key] >= 0 ? (values[idx[key]] || '') : '');

  return {
    step: get('step') || String(ordinal),
    desc: get('desc'),
    expected: get('expected'),
    measured: get('measured'),
    notes: get('notes'),
    image: get('image'),
    timestamp: get('timestamp'),
    signature: get('signature'),
    correction: get('correction'),
    anomaly: get('anomaly'),
    skipReason: get('skipReason')
  };
}
