/**
 * Procedure Builder — define a test procedure's steps from scratch, import/
 * merge one from CSV/XLSX, export it as a standalone XLSX, or hand it off to
 * Test Procedure Runner to start executing it right away.
 *
 * The "start now" handoff doesn't duplicate the Runner's execution engine:
 * it writes the exact same session shape Procedure Runner's own
 * ui/session-storage.js saveSession() does, under the same localStorage key
 * (both apps are same-origin, so localStorage is already shared) — then
 * navigates there, where the Runner's existing "resume session" prompt on
 * its load screen picks it up like any other in-progress run.
 */
import { $ } from '../core/dom-helpers.js';
import { parseCSV } from '../../../../shared/js/csv.js';
import { mapHeader, extractStep } from '../../../../shared/js/column-mapping.js';
import { downloadBlob } from '../../../../shared/js/download.js';
import { excelValue, recoverEmbeddedImages, buildProcedureWorksheet } from '../../../../shared/js/procedure-xlsx.js';
import { daniIcon } from '../../../../shared/js/dani-icons.js';

const DRAFT_KEY = 'procbuilder_draft';
// Must match Procedure Runner's own ui/session-storage.js SESSION_KEY — this
// is the hand-off contract between the two apps.
const RUNNER_SESSION_KEY = 'procrunner_session';

let builderRows = 0;
let draftSaveTimer = null;

/** Restores an autosaved draft, or starts with two blank rows — called once on page load. */
export function initBuilder() {
  const restored = restoreDraft();
  if (!restored) { addBuilderRow(); addBuilderRow(); }
}

function collectBuilderRowEls() {
  return [...document.querySelectorAll('.builder-row')];
}

function renumberBuilderRows() {
  const rows = collectBuilderRowEls();
  rows.forEach((r, i) => {
    r.querySelector('.muted').textContent = (i + 1) + '.';
    const up = r.querySelector('.builder-up');
    const down = r.querySelector('.builder-down');
    if (up) up.disabled = i === 0;
    if (down) down.disabled = i === rows.length - 1;
  });
  builderRows = rows.length;
}

function moveBuilderRow(row, dir) {
  const list = $('builderList');
  if (dir < 0 && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
  else if (dir > 0 && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
  renumberBuilderRows();
  scheduleDraftSave();
}

/** Adds a builder row, optionally pre-filled from `initial` ({desc, expected, image}). */
export function addBuilderRow(initial) {
  builderRows++;

  const div = document.createElement('div');
  div.className = 'builder-row';
  div._imageData = (initial && initial.image) || '';
  div._imageName = '';

  const num = document.createElement('span');
  num.className = 'muted';
  num.style.alignSelf = 'center';
  num.textContent = builderRows + '.';

  const desc = document.createElement('input');
  desc.placeholder = 'Descrizione dello step';
  desc.className = 'b-desc';
  desc.value = (initial && initial.desc) || '';
  desc.oninput = scheduleDraftSave;

  const exp = document.createElement('input');
  exp.placeholder = 'Valore atteso (opzionale)';
  exp.className = 'b-exp';
  exp.value = (initial && initial.expected) || '';
  exp.oninput = scheduleDraftSave;

  const imageWrap = document.createElement('div');
  imageWrap.className = 'builder-image-wrap';

  const imageBtn = document.createElement('button');
  imageBtn.className = 'btn builder-img-btn';
  imageBtn.type = 'button';
  imageBtn.innerHTML = div._imageData
    ? daniIcon('image', { size: 14 }) + '<span>Cambia</span>'
    : daniIcon('image', { size: 14 }) + '<span>Immagine</span>';

  const thumb = document.createElement('img');
  thumb.className = 'builder-thumb';
  thumb.alt = 'Anteprima';

  const removeImgBtn = document.createElement('button');
  removeImgBtn.className = 'builder-img-remove';
  removeImgBtn.type = 'button';
  removeImgBtn.textContent = '×';
  removeImgBtn.title = 'Rimuovi immagine';

  if (div._imageData) {
    thumb.src = div._imageData;
    thumb.style.display = 'block';
    removeImgBtn.style.display = 'flex';
  }

  removeImgBtn.onclick = () => {
    div._imageData = '';
    div._imageName = '';
    thumb.removeAttribute('src');
    thumb.style.display = 'none';
    removeImgBtn.style.display = 'none';
    imageBtn.innerHTML = daniIcon('image', { size: 14 }) + '<span>Immagine</span>';
    scheduleDraftSave();
  };

  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/*';
  imageInput.style.display = 'none';
  imageInput.onchange = () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      div._imageData = reader.result;
      div._imageName = file.name;
      thumb.src = reader.result;
      thumb.style.display = 'block';
      removeImgBtn.style.display = 'flex';
      imageBtn.innerHTML = daniIcon('image', { size: 14 }) + '<span>Cambia</span>';
      scheduleDraftSave();
    };
    reader.readAsDataURL(file);
  };
  imageBtn.onclick = () => imageInput.click();
  imageWrap.append(imageBtn, thumb, removeImgBtn, imageInput);

  const controls = document.createElement('div');
  controls.className = 'builder-controls';

  const move = document.createElement('div');
  move.className = 'builder-move';
  const up = document.createElement('button');
  up.className = 'builder-up';
  up.type = 'button';
  up.textContent = '↑';
  up.title = 'Sposta su';
  up.onclick = () => moveBuilderRow(div, -1);
  const down = document.createElement('button');
  down.className = 'builder-down';
  down.type = 'button';
  down.textContent = '↓';
  down.title = 'Sposta giù';
  down.onclick = () => moveBuilderRow(div, 1);
  move.append(up, down);

  const del = document.createElement('button');
  del.className = 'builder-del';
  del.textContent = '×';
  del.type = 'button';
  del.title = 'Elimina step';
  del.onclick = () => { div.remove(); renumberBuilderRows(); scheduleDraftSave(); };

  controls.append(move, del);

  div.append(num, desc, exp, imageWrap, controls);
  $('builderList').appendChild(div);
  renumberBuilderRows();
  return div;
}

/** Reads the current builder rows into plain {desc, expected, image} objects. */
function collectBuilderSteps() {
  return collectBuilderRowEls().map(r => ({
    desc: r.querySelector('.b-desc').value.trim(),
    expected: r.querySelector('.b-exp').value.trim(),
    image: r._imageData || ''
  }));
}

function replaceBuilderRows(steps) {
  $('builderList').innerHTML = '';
  builderRows = 0;
  steps.forEach(s => addBuilderRow(s));
}

/* ==================== Draft persistence (localStorage, this browser only) ==================== */

/** Debounced auto-save, called on every field edit. Exposed on window for the procName input. */
export function scheduleDraftSave() {
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(saveDraft, 300);
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      procName: $('builderProcName') ? $('builderProcName').value : '',
      steps: collectBuilderSteps(),
      savedAt: new Date().toISOString()
    }));
    updateDraftInfo();
  } catch (e) {
    console.warn('Bozza builder non salvata:', e);
    const el = $('builderDraftInfo');
    if (el) el.innerHTML = daniIcon('warning', { size: 13 }) + '<b>Bozza troppo grande per l\'auto-salvataggio (immagini pesanti).</b>';
  }
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const draft = JSON.parse(raw);
    if (!draft.steps || !draft.steps.length) return false;
    draft.steps.forEach(s => addBuilderRow(s));
    if (draft.procName && $('builderProcName')) $('builderProcName').value = draft.procName;
    updateDraftInfo();
    return true;
  } catch {
    return false;
  }
}

function updateDraftInfo() {
  const el = $('builderDraftInfo');
  if (!el) return;
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) { el.textContent = ''; return; }
  try {
    const draft = JSON.parse(raw);
    const when = draft.savedAt ? new Date(draft.savedAt).toLocaleString('it-IT') : '—';
    el.innerHTML = 'Bozza salvata automaticamente il <b>' + when + '</b> (solo in questo browser)';
  } catch {
    el.textContent = '';
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

/** "Nuova" — clears the builder back to two blank rows, confirming first if there's content. */
export function newBuilderProcedure() {
  const hasContent = collectBuilderSteps().some(s => s.desc || s.expected || s.image);
  if (hasContent && !confirm('Creare una nuova procedura? Gli step correnti verranno eliminati.')) return;
  replaceBuilderRows([]);
  if ($('builderProcName')) $('builderProcName').value = '';
  addBuilderRow();
  addBuilderRow();
  scheduleDraftSave();
}

/* ==================== Import (CSV/XLSX) into the builder ==================== */

export function importIntoBuilder() {
  $('builderImportInput').click();
}

export async function onBuilderImportFile(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === 'xlsx') await importBuilderFromXLSX(file);
    else {
      const text = await file.text();
      importBuilderFromCSV(text, file.name);
    }
  } catch (err) {
    console.error(err);
    alert('Impossibile leggere il file: ' + (err?.message || err));
  }
}

/** Only desc/expected/image are kept on import — the same fields the builder UI edits
 *  (a richer file, e.g. one exported mid-run, still imports cleanly; the rest is dropped). */
function replaceBuilderStepsFromImport(parsed, filename) {
  const hasContent = collectBuilderSteps().some(s => s.desc || s.expected || s.image);
  if (hasContent && !confirm('Sostituire gli step attuali con quelli importati?')) return;
  replaceBuilderRows(parsed);
  if ($('builderProcName') && !$('builderProcName').value) {
    $('builderProcName').value = filename.replace(/\.[^.]+$/, '');
  }
  scheduleDraftSave();
}

function importBuilderFromCSV(text, filename) {
  const rows = parseCSV(text);
  if (rows.length < 2) { alert('Il file CSV è vuoto o non contiene righe dati.'); return; }
  const idx = mapHeader(rows[0]);
  if (idx.desc === -1) { alert('Colonna "Descrizione" non trovata nell\'intestazione del CSV.'); return; }

  const parsed = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every(c => (c || '').trim() === '')) continue;
    const step = extractStep(idx, row, parsed.length + 1);
    parsed.push({ desc: step.desc, expected: step.expected, image: step.image });
  }
  if (!parsed.length) { alert('Nessuno step valido trovato nel CSV.'); return; }
  replaceBuilderStepsFromImport(parsed, filename);
}

async function importBuilderFromXLSX(file) {
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
    const step = extractStep(idx, values, parsed.length + 1);
    parsed.push({ desc: step.desc, expected: step.expected, image: step.image });
  }
  if (!parsed.length) { alert('Nessuno step valido trovato nel XLSX.'); return; }

  recoverEmbeddedImages(workbook, worksheet, parsed);

  replaceBuilderStepsFromImport(parsed, file.name);
}

/* ==================== Export straight from the builder ==================== */

function builderBaseName() {
  const name = ($('builderProcName') ? $('builderProcName').value : '').trim();
  return name || ('procedura_' + new Date().toISOString().slice(0, 10));
}

/** "Esporta XLSX" — exports the draft as a procedure file without starting it. */
export async function exportBuilderXlsx() {
  const valid = collectBuilderSteps().filter(s => s.desc);
  if (!valid.length) { alert('Aggiungi almeno uno step con una descrizione prima di esportare.'); return; }
  if (typeof ExcelJS === 'undefined') {
    alert('La libreria XLSX non è disponibile. Controlla la connessione Internet e riprova.');
    return;
  }

  const defaultName = builderBaseName();
  const inputName = prompt('Conferma il nome del file da salvare (senza estensione):', defaultName);
  if (inputName === null) return;

  let baseName = inputName.trim();
  if (!baseName) { alert('Nome non valido. Operazione annullata.'); return; }
  baseName = baseName.replace(/\.xlsx$/i, '');

  const confirmed = confirm(
    'Confermi di voler salvare il file come:\n\n' + baseName + '.xlsx\n\nStep: ' + valid.length
  );
  if (!confirmed) return;

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Procedure Builder';
    wb.created = new Date();
    const steps = valid.map((s, i) => ({ step: String(i + 1), desc: s.desc, expected: s.expected, image: s.image }));
    buildProcedureWorksheet(wb, steps);

    const buffer = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      baseName + '.xlsx'
    );
  } catch (err) {
    console.error(err);
    alert('Errore durante l’esportazione XLSX: ' + (err?.message || err));
  }
}

/**
 * "Avvia in Procedure Runner" — hands the draft off to Test Procedure Runner
 * as a resumable session (see module docstring) instead of running it here.
 */
export function startInRunner() {
  const rows = collectBuilderSteps();
  const parsed = [];

  rows.forEach(s => {
    if (!s.desc) return;
    parsed.push({
      step: String(parsed.length + 1),
      desc: s.desc,
      expected: s.expected,
      measured: '',
      notes: '',
      image: s.image,
      timestamp: '',
      signature: '',
      correction: '',
      anomaly: '',
      skipReason: ''
    });
  });

  if (!parsed.length) { alert('Inserisci almeno uno step con una descrizione.'); return; }

  const procName = ($('builderProcName') ? $('builderProcName').value : '').trim();
  try {
    localStorage.setItem(RUNNER_SESSION_KEY, JSON.stringify({
      steps: parsed,
      currentIndex: 0,
      sourceName: (procName || 'nuova_procedura') + '.xlsx',
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    alert('Impossibile passare la procedura al Runner: ' + (e?.message || e));
    return;
  }
  clearDraft();
  location.href = '../procedure-runner/index.html';
}
