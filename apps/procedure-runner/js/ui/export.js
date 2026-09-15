import { nowStamp } from '../core/time.js';
import { toCsvText } from '../logic/csv.js';
import { PROCEDURE_COLUMNS } from '../logic/column-mapping.js';
import { buildFullReportText } from '../logic/report.js';
import { state } from './state.js';
import { downloadBlob } from './download.js';

function baseName() {
  return (state.sourceName || 'procedura').replace(/\.[^.]+$/, '');
}

function stepToRow(s) {
  return [s.step, s.desc, s.expected, s.measured, s.notes, s.image, s.timestamp, s.signature, s.correction, s.anomaly, s.skipReason];
}

/** Downloads the current procedure (with all sign-offs/notes) as CSV. */
export function exportUpdatedCsv() {
  if (!state.steps.length) { alert('Nessuna procedura caricata.'); return; }

  const rows = [PROCEDURE_COLUMNS, ...state.steps.map(stepToRow)];
  const blob = new Blob([toCsvText(rows)], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, baseName() + '_aggiornata.csv');
}

/** Downloads the current procedure as XLSX, embedding any data-URL images. */
export async function exportUpdatedXlsx() {
  if (!state.steps.length) { alert('Nessuna procedura caricata.'); return; }
  if (typeof ExcelJS === 'undefined') {
    alert('La libreria XLSX non è disponibile. Controlla la connessione Internet e riprova.');
    return;
  }

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Test Procedure Runner';
    wb.created = new Date();

    const ws = wb.addWorksheet('Procedura');
    ws.addRow(PROCEDURE_COLUMNS);
    ws.columns = [
      { width: 8 }, { width: 55 }, { width: 22 }, { width: 18 }, { width: 35 }, { width: 22 },
      { width: 22 }, { width: 18 }, { width: 35 }, { width: 18 }, { width: 30 }
    ];
    ws.getRow(1).font = { bold: true };
    ws.freezePanes = { ySplit: 1 };

    state.steps.forEach((s, i) => {
      const row = ws.addRow([s.step, s.desc, s.expected, s.measured, s.notes, '', s.timestamp, s.signature, s.correction, s.anomaly, s.skipReason]);
      if (s.image && s.image.startsWith('data:image/')) {
        const ext = s.image.startsWith('data:image/jpeg') ? 'jpeg' : s.image.startsWith('data:image/gif') ? 'gif' : 'png';
        const imageId = wb.addImage({ base64: s.image, extension: ext });
        row.height = 78;
        ws.addImage(imageId, { tl: { col: 5, row: i + 1 }, ext: { width: 115, height: 65 } });
      }
    });

    const buffer = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      baseName() + '_aggiornata.xlsx'
    );
  } catch (err) {
    console.error(err);
    alert('Errore durante l’esportazione XLSX: ' + (err?.message || err));
  }
}

/** Downloads the full human-readable .txt session report. */
export function exportReportTxt() {
  if (!state.steps.length) { alert('Nessuna procedura caricata.'); return; }

  const text = buildFullReportText(state.steps, {
    username: state.username,
    sourceName: state.sourceName,
    generatedAt: nowStamp()
  });

  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'Report_Procedura_' + Date.now() + '.txt');
}
