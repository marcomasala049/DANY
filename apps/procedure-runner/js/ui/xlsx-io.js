import { mapHeader, extractStep, PROCEDURE_COLUMNS, PROCEDURE_SAMPLE_ROWS } from '../../../../shared/js/column-mapping.js';
import { findFirstUnsigned } from '../logic/steps.js';
import { state } from './state.js';
import { saveSession } from './session-storage.js';
import { enterExecution } from './execution.js';
import { downloadBlob } from '../../../../shared/js/download.js';
import { excelValue, recoverEmbeddedImages, buildProcedureWorksheet } from '../../../../shared/js/procedure-xlsx.js';

export { excelValue, recoverEmbeddedImages, buildProcedureWorksheet };

/** Loads a procedure from an .xlsx file (first worksheet), recovering embedded images when present. */
export async function loadFromXLSXFile(file) {
  if (typeof ExcelJS === 'undefined') {
    alert('La libreria XLSX non è disponibile. Controlla la connessione Internet e riprova.');
    return;
  }

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) { alert('Il file XLSX non contiene fogli di lavoro.'); return; }

  const headerRow = worksheet.getRow(1).values.slice(1).map(excelValue);
  const idx = mapHeader(headerRow);
  if (idx.desc === -1) { alert('Colonna "Descrizione" non trovata nel primo foglio XLSX.'); return; }

  const parsed = [];
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const values = [];
    for (let c = 1; c <= Math.max(worksheet.columnCount, headerRow.length); c++) {
      values[c - 1] = excelValue(row.getCell(c).value);
    }
    if (values.every(c => !String(c || '').trim())) continue;
    parsed.push(extractStep(idx, values, parsed.length + 1));
  }

  if (!parsed.length) { alert('Nessuno step valido trovato nel XLSX.'); return; }

  recoverEmbeddedImages(workbook, worksheet, parsed);

  state.steps = parsed;
  state.sourceName = file.name;
  state.currentIndex = findFirstUnsigned(state.steps);
  saveSession();
  enterExecution();
}

/** Downloads a starter .xlsx template with sample rows and frozen header. */
export async function downloadXlsxTemplate() {
  if (typeof ExcelJS === 'undefined') {
    alert('La libreria XLSX non è disponibile. Controlla la connessione Internet e riprova.');
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Procedura');
  ws.addRow(PROCEDURE_COLUMNS);
  PROCEDURE_SAMPLE_ROWS.forEach(r => ws.addRow(r));
  ws.columns = [
    { width: 8 }, { width: 55 }, { width: 22 }, { width: 18 }, { width: 35 }, { width: 22 },
    { width: 22 }, { width: 18 }, { width: 35 }, { width: 18 }, { width: 30 }
  ];
  ws.getRow(1).font = { bold: true };
  ws.freezePanes = { ySplit: 1 };

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'modello_procedura.xlsx'
  );
}
