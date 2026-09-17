import { nowStamp } from '../core/time.js';
import { buildExportRows, buildTxtReport, EXPORT_COLUMNS } from '../logic/report.js';
import { state } from './state.js';
import { getCurrentConnector } from './diagram.js';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads the full human-readable .txt report — works fully offline (Blob + local download). */
export function exportTxt() {
  if (!state.steps.length) { alert('Nessuna misura da esportare.'); return; }
  const connector = getCurrentConnector();
  const text = buildTxtReport(connector, state.steps, { generatedAt: nowStamp() });
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'verifica_' + (connector ? connector.id : 'connettore') + '_' + Date.now() + '.txt');
}

/** Downloads the measurement table as .xlsx (needs the ExcelJS CDN script; falls back to an alert if it never loaded). */
export async function exportXlsx() {
  if (!state.steps.length) { alert('Nessuna misura da esportare.'); return; }
  if (typeof ExcelJS === 'undefined') {
    alert('La libreria XLSX non è disponibile (serve una connessione Internet la prima volta). Puoi comunque esportare il report in .TXT, che funziona offline.');
    return;
  }

  try {
    const connector = getCurrentConnector();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'DANI Pin Function Tool';
    wb.created = new Date();

    const ws = wb.addWorksheet('Verifica');
    buildExportRows(connector, state.steps).forEach(row => ws.addRow(row));
    ws.getRow(1).font = { bold: true };
    ws.freezePanes = { ySplit: 1 };
    ws.columns = EXPORT_COLUMNS.map(() => ({ width: 18 }));

    const buffer = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'verifica_' + (connector ? connector.id : 'connettore') + '_' + Date.now() + '.xlsx'
    );
  } catch (err) {
    console.error(err);
    alert('Errore durante l’esportazione XLSX: ' + (err?.message || err));
  }
}
