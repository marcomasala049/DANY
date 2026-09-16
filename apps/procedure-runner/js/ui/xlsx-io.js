import { mapHeader, extractStep, PROCEDURE_COLUMNS, PROCEDURE_SAMPLE_ROWS } from '../logic/column-mapping.js';
import { findFirstUnsigned } from '../logic/steps.js';
import { state } from './state.js';
import { saveSession } from './session-storage.js';
import { enterExecution } from './execution.js';
import { downloadBlob } from './download.js';

export function excelValue(v) {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map(x => x.text || '').join('');
    if (v.text != null) return String(v.text);
    if (v.result != null) return String(v.result);
    if (v.hyperlink) return String(v.text || v.hyperlink);
  }
  return String(v);
}

export function arrayBufferToDataUrl(buffer, extension) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const mime = extension === 'jpeg' || extension === 'jpg' ? 'image/jpeg' : extension === 'gif' ? 'image/gif' : 'image/png';
  return 'data:' + mime + ';base64,' + btoa(binary);
}

/**
 * Recovers embedded images from an XLSX worksheet into `parsed[i].image` as
 * data URLs, matching each image to the parsed row at the same sheet row.
 * Works on any array of objects with an `.image` field — reused by both the
 * Runner's file loader and the Builder's import (see ui/builder.js).
 */
export function recoverEmbeddedImages(workbook, worksheet, parsed) {
  try {
    const media = workbook.model && workbook.model.media ? workbook.model.media : [];
    for (const image of worksheet.getImages()) {
      const mediaItem = media.find(m => m.index === image.imageId);
      if (!mediaItem) continue;

      const nativeRow = image.range?.tl?.nativeRow ?? image.range?.tl?.row;
      if (nativeRow == null) continue;

      const dataUrl = mediaItem.buffer
        ? arrayBufferToDataUrl(mediaItem.buffer, mediaItem.extension)
        : mediaItem.base64
          ? (String(mediaItem.base64).startsWith('data:') ? mediaItem.base64 : 'data:image/' + mediaItem.extension + ';base64,' + mediaItem.base64)
          : '';

      const parsedIndex = Number(nativeRow) - 1; // Excel row 2 -> parsed[0]
      if (dataUrl && parsed[parsedIndex]) parsed[parsedIndex].image = dataUrl;
    }
  } catch (imgErr) {
    console.warn('Immagini XLSX non recuperate:', imgErr);
  }
}

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

/**
 * Adds a "Procedura" worksheet to `workbook` with the standard header/column
 * widths/frozen header row, one row per step (embedding any data-URL image),
 * and returns it. Shared by the Runner's own export (ui/export.js) and the
 * Builder's standalone XLSX export (ui/builder.js) so the XLSX layout is
 * defined in exactly one place.
 */
export function buildProcedureWorksheet(workbook, steps) {
  const ws = workbook.addWorksheet('Procedura');
  ws.addRow(PROCEDURE_COLUMNS);
  ws.columns = [
    { width: 8 }, { width: 55 }, { width: 22 }, { width: 18 }, { width: 35 }, { width: 22 },
    { width: 22 }, { width: 18 }, { width: 35 }, { width: 18 }, { width: 30 }
  ];
  ws.getRow(1).font = { bold: true };
  ws.freezePanes = { ySplit: 1 };

  steps.forEach((s, i) => {
    const row = ws.addRow([
      s.step, s.desc, s.expected || '', s.measured || '', s.notes || '', '',
      s.timestamp || '', s.signature || '', s.correction || '', s.anomaly || '', s.skipReason || ''
    ]);
    if (s.image && s.image.startsWith('data:image/')) {
      const ext = s.image.startsWith('data:image/jpeg') ? 'jpeg' : s.image.startsWith('data:image/gif') ? 'gif' : 'png';
      const imageId = workbook.addImage({ base64: s.image, extension: ext });
      row.height = 78;
      ws.addImage(imageId, { tl: { col: 5, row: i + 1 }, ext: { width: 115, height: 65 } });
    }
  });

  return ws;
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
