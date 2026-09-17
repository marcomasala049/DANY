import { nowStamp } from '../core/time.js';
import { toCsvText } from '../../../../shared/js/csv.js';
import { PROCEDURE_COLUMNS } from '../../../../shared/js/column-mapping.js';
import { buildFullReportText } from '../logic/report.js';
import { state } from './state.js';
import { downloadBlob } from '../../../../shared/js/download.js';
import { buildProcedureWorksheet } from './xlsx-io.js';
import { daniAlert } from '../../../../shared/js/dialog.js';

function baseName() {
  return (state.sourceName || 'procedura').replace(/\.[^.]+$/, '');
}

function stepToRow(s) {
  return [s.step, s.desc, s.expected, s.measured, s.notes, s.image, s.timestamp, s.signature, s.correction, s.anomaly, s.skipReason];
}

/** Downloads the current procedure (with all sign-offs/notes) as CSV. */
export async function exportUpdatedCsv() {
  if (!state.steps.length) { await daniAlert('Nessuna procedura caricata.'); return; }

  const rows = [PROCEDURE_COLUMNS, ...state.steps.map(stepToRow)];
  const blob = new Blob([toCsvText(rows)], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, baseName() + '_aggiornata.csv');
}

/** Downloads the current procedure as XLSX, embedding any data-URL images. */
export async function exportUpdatedXlsx() {
  if (!state.steps.length) { await daniAlert('Nessuna procedura caricata.'); return; }
  if (typeof ExcelJS === 'undefined') {
    await daniAlert('La libreria XLSX non è disponibile. Controlla la connessione Internet e riprova.');
    return;
  }

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Test Procedure Runner';
    wb.created = new Date();

    buildProcedureWorksheet(wb, state.steps);

    const buffer = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      baseName() + '_aggiornata.xlsx'
    );
  } catch (err) {
    console.error(err);
    await daniAlert('Errore durante l’esportazione XLSX: ' + (err?.message || err));
  }
}

/** Downloads the full human-readable .txt session report. */
export async function exportReportTxt() {
  if (!state.steps.length) { await daniAlert('Nessuna procedura caricata.'); return; }

  const text = buildFullReportText(state.steps, {
    username: state.username,
    sourceName: state.sourceName,
    generatedAt: nowStamp()
  });

  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'Report_Procedura_' + Date.now() + '.txt');
}
