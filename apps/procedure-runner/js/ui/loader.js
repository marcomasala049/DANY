import { $ } from '../core/dom-helpers.js';
import { parseCSV, toCsvText } from '../../../../shared/js/csv.js';
import { mapHeader, extractStep, PROCEDURE_COLUMNS, PROCEDURE_SAMPLE_ROWS } from '../../../../shared/js/column-mapping.js';
import { findFirstUnsigned } from '../logic/steps.js';
import { state } from './state.js';
import { saveSession } from './session-storage.js';
import { enterExecution } from './execution.js';
import { downloadBlob } from '../../../../shared/js/download.js';
import { loadFromXLSXFile } from './xlsx-io.js';

export async function onFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  await loadProcedureFile(file);
}

export async function loadProcedureFile(file) {
  try {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === 'xlsx') {
      await loadFromXLSXFile(file);
    } else {
      const text = await file.text();
      loadFromCSVText(text, file.name);
    }
  } catch (err) {
    console.error(err);
    alert('Impossibile leggere il file: ' + (err?.message || err));
  }
}

export function loadFromCSVText(text, filename) {
  const rows = parseCSV(text);
  if (rows.length < 2) { alert('Il file CSV è vuoto o non contiene righe dati.'); return; }

  const idx = mapHeader(rows[0]);
  if (idx.desc === -1) { alert('Colonna "Descrizione" non trovata nell\'intestazione del CSV. Controlla il formato.'); return; }

  const parsed = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every(c => (c || '').trim() === '')) continue;
    parsed.push(extractStep(idx, row, parsed.length + 1));
  }

  if (!parsed.length) { alert('Nessuno step valido trovato nel CSV.'); return; }

  state.steps = parsed;
  state.sourceName = filename;
  state.currentIndex = findFirstUnsigned(state.steps);
  saveSession();
  enterExecution();
}

/** Downloads a starter .csv template with sample rows. */
export function downloadTemplate() {
  const rows = [PROCEDURE_COLUMNS, ...PROCEDURE_SAMPLE_ROWS];
  downloadBlob(new Blob([toCsvText(rows)], { type: 'text/csv;charset=utf-8' }), 'modello_procedura.csv');
}

/** True when a drag carries files (as opposed to e.g. dragged text/links). */
function isFileDrag(e) {
  const dt = e.dataTransfer;
  return !!(dt && dt.types && Array.from(dt.types).includes('Files'));
}

/**
 * Wires drag-and-drop onto the load screen's drop zone. Also blocks the
 * browser's default "navigate to/open the dropped file" behavior for any
 * file dragged over the page — not just over the drop zone. Without this,
 * a file dropped slightly off-target (or while a procedure is already
 * running and the drop zone isn't even on screen) would replace the tab
 * with the raw file instead of being ignored.
 */
export function initDropZone() {
  ['dragover', 'drop'].forEach(ev => {
    document.addEventListener(ev, e => { if (isFileDrag(e)) e.preventDefault(); });
  });

  ['dragover', 'dragleave', 'drop'].forEach(ev => {
    document.addEventListener(ev, e => {
      const dz = $('dropZone');
      const overDropZone = e.target && e.target.closest && e.target.closest('#dropZone');
      if (!dz || !overDropZone) return;

      if (ev === 'dragover') {
        dz.classList.add('drag');
      } else if (ev === 'dragleave') {
        dz.classList.remove('drag');
      } else if (ev === 'drop') {
        dz.classList.remove('drag');
        const f = e.dataTransfer.files[0];
        if (f) loadProcedureFile(f);
      }
    });
  });
}
