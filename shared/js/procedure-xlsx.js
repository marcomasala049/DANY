/**
 * XLSX helpers for the procedure file format, shared by Procedure Runner
 * (loading/exporting a running procedure) and Procedure Builder (exporting
 * a newly-created one) so the file layout is defined in exactly one place.
 * Depends on the global `ExcelJS` (loaded via CDN script in each app's own
 * index.html) only inside the functions that actually touch a workbook.
 */
import { PROCEDURE_COLUMNS } from './column-mapping.js';

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
 * Works on any array of objects with an `.image` field.
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

/**
 * Adds a "Procedura" worksheet to `workbook` with the standard header/column
 * widths/frozen header row, one row per step (embedding any data-URL image),
 * and returns it.
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
