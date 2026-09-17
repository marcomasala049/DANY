import { $, setText, setHtml } from '../core/dom-helpers.js';
import { escapeHtml } from '../../../../shared/js/dom-utils.js';
import { daniIcon } from '../../../../shared/js/dani-icons.js';
import { clearDirty } from './editor-stats.js';
import { daniAlert } from '../../../../shared/js/dialog.js';

const LOCAL_SERVER = 'http://127.0.0.1:8080';

let targetFilePath = '';
let selectedSaveDirectory = null;
let targetFileHandle = null;
/** True only for a file actually opened through the local server (hash-launched
 *  from open_editor.bat) — the one case where writing back through it makes sense. */
let isServerBackedFile = false;

export function getTargetFilePath() {
  return targetFilePath;
}

function makeSaveStamp() {
  return '[SALVATAGGIO ' + new Date().toLocaleString('it-IT') + ']';
}

function baseFileName(path) {
  return (path || 'nuovo_file.txt').replace(/^.*[\\/]/, '') || 'nuovo_file.txt';
}

/** Always-available fallback: hands the user a real, recoverable .txt via a download. */
function downloadTextFile(path, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = baseFileName(path);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function writeViaHandle(handle, content) {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Cosmetic UI updates only: if anything here fails (missing element, timing…)
 * it must NOT make the save look like it failed, since the file has already
 * been written to disk (or downloaded) successfully by this point.
 * @param {'handle'|'server'|'download'} method how the file actually got saved,
 *   so the status line can be honest about a download not being an in-place save.
 */
function afterSaveUI(path, stamped, method) {
  try {
    const editor = $('editor');
    if (editor) editor.value = stamped; else console.error('[afterSaveUI] elemento mancante: #editor');
    clearDirty();
    targetFilePath = path;
    setText('file-label', path);
    setText('saveState', new Date().toLocaleTimeString('it-IT'));

    const status = $('status');
    if (status) status.className = 'status-bar status-ok';
    const verb = method === 'download' ? 'File scaricato' : 'File salvato';
    const note = method === 'download'
      ? ' <span class="muted">(nuova copia — questo browser non supporta il salvataggio diretto sul file originale)</span>'
      : '';
    setHtml('status', '> ' + verb + ': <span>' + escapeHtml(path) + '</span>' + note + ' | ' + new Date().toLocaleTimeString('it-IT'));
  } catch (uiErr) {
    console.error('[afterSaveUI] aggiornamento interfaccia fallito (il file però è stato salvato correttamente):', uiErr);
  }
}

/**
 * Writes the editor's content to disk, trying — in order — the most direct
 * method still available: an existing file handle, then (only for a file that
 * came from the local server) the server itself, then a one-time native save
 * dialog (File System Access API), then a plain download as the universal
 * last resort. Each step falls through to the next on failure instead of
 * giving up, so saving never *requires* the local server to be running.
 */
async function writeFile(path, addStamp = true) {
  const editorEl = $('editor');
  if (!editorEl) throw new Error('Elemento #editor non trovato nel DOM: impossibile leggere il testo da salvare.');

  const original = editorEl.value;
  const base = original.trimEnd();
  const stamped = addStamp ? (base ? base + '\n' : '') + makeSaveStamp() : original;

  // 1) An existing handle (from "Apri File" or a previous Save As) — direct disk write.
  if (targetFileHandle) {
    await writeViaHandle(targetFileHandle, stamped);
    afterSaveUI(path, stamped, 'handle');
    return stamped;
  }

  // 2) A file originally loaded from the local server — keep using it, but if the
  //    server has since gone offline, fall through to (3)/(4) instead of failing.
  if (isServerBackedFile) {
    try {
      const r = await fetch(LOCAL_SERVER + '/save', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-File-Path': encodeURIComponent(path) },
        body: stamped
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      afterSaveUI(path, stamped, 'server');
      return stamped;
    } catch (serverErr) {
      console.warn('[writeFile] server locale non raggiungibile, provo un salvataggio dal browser:', serverErr);
    }
  }

  // 3) File System Access API: one native "save as" dialog, then a direct disk write.
  if (window.showSaveFilePicker) {
    let handle = null;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: baseFileName(path),
        types: [{ description: 'File di testo', accept: { 'text/plain': ['.txt'] } }]
      });
    } catch (pickerErr) {
      if (pickerErr.name === 'AbortError') { const e = new Error('Salvataggio annullato.'); e.userCancelled = true; throw e; }
      console.warn('[writeFile] File System Access non disponibile per questo salvataggio, scarico una copia:', pickerErr);
    }
    if (handle) {
      await writeViaHandle(handle, stamped);
      targetFileHandle = handle;
      isServerBackedFile = false;
      afterSaveUI(handle.name, stamped, 'handle');
      return stamped;
    }
  }

  // 4) Last resort, always available offline: a real, recoverable download.
  downloadTextFile(path, stamped);
  isServerBackedFile = false;
  afterSaveUI(baseFileName(path), stamped, 'download');
  return stamped;
}

export async function salvaFile() {
  if (!targetFilePath) { salvaCome(); return; }
  try {
    await writeFile(targetFilePath, true);
  } catch (e) {
    if (e.userCancelled) return;
    console.error('[salvaFile] salvataggio effettivo fallito:', e);
    const status = $('status');
    if (status) { status.className = 'status-bar status-error'; status.innerText = '> Errore salvataggio: ' + e.message; }
    await daniAlert('Errore durante il salvataggio: ' + e.message);
  }
}

export function salvaCome() {
  $('saveModal').classList.add('show');
  selectedSaveDirectory = null;
  targetFileHandle = null;
  $('saveFolderStatus').innerText = 'Scelta al momento del salvataggio';
  $('saveFolderStatus').classList.add('default');
  $('newFileName').focus();
  $('newFileName').select();
}

export function chiudiSalvaCome() {
  $('saveModal').classList.remove('show');
}

export async function selezionaCartellaSalvataggio() {
  if (!window.showDirectoryPicker) {
    await daniAlert('La selezione della cartella non è supportata da questo browser. Lasciando il campo vuoto, al salvataggio ti verrà comunque chiesto dove salvare (o il file verrà scaricato).');
    return;
  }
  try {
    selectedSaveDirectory = await window.showDirectoryPicker({ mode: 'readwrite' });
    $('saveFolderStatus').innerHTML = daniIcon('folder', { size: 13 }) + '<span>' + escapeHtml(selectedSaveDirectory.name) + '</span>';
    $('saveFolderStatus').classList.remove('default');
  } catch (e) {
    if (e.name !== 'AbortError') await daniAlert('Impossibile selezionare la cartella: ' + e.message);
  }
}

export async function confermaSalvaCome() {
  let name = $('newFileName').value.trim();
  if (!name) { await daniAlert('Inserisci un nome file.'); return; }
  if (!/\.txt$/i.test(name)) name += '.txt';

  try {
    isServerBackedFile = false;
    if (selectedSaveDirectory) {
      targetFileHandle = await selectedSaveDirectory.getFileHandle(name, { create: true });
      const folderPath = selectedSaveDirectory.name + '\\' + name;
      await writeFile(folderPath, true);
    } else {
      targetFileHandle = null;
      await writeFile(name, true);
    }
    history.replaceState(null, '', '#' + encodeURIComponent(targetFilePath));
    chiudiSalvaCome();
  } catch (e) {
    if (e.userCancelled) return;
    console.error('[confermaSalvaCome] creazione/salvataggio file fallito:', e);
    targetFileHandle = null;
    const status = $('status');
    if (status) { status.className = 'status-bar status-error'; status.innerText = '> Errore creazione file: ' + e.message; }
    await daniAlert('Impossibile creare il file: ' + e.message);
  }
}

/**
 * Opens an existing .txt file directly from disk — no server involved. Uses
 * the File System Access API (showOpenFilePicker) when available, which also
 * gives us a handle so subsequent "Salva Modifiche" writes back in place;
 * falls back to a plain <input type=file> (see onOpenFileSelected) on
 * browsers without it, which can read the file but not write back to it.
 */
export async function apriFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'File di testo', accept: { 'text/plain': ['.txt', '.text'] } }],
        excludeAcceptAllOption: false,
        multiple: false
      });
      const file = await handle.getFile();
      const text = await file.text();
      applyOpenedFile(file.name, text, handle);
    } catch (e) {
      if (e.name !== 'AbortError') await daniAlert('Impossibile aprire il file: ' + e.message);
    }
    return;
  }
  $('openFileInput').click();
}

/** Change handler for the fallback <input type=file id="openFileInput">. */
export async function onOpenFileSelected(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    applyOpenedFile(file.name, text, null);
  } catch (e) {
    await daniAlert('Impossibile leggere il file: ' + e.message);
  }
}

function applyOpenedFile(name, text, handle) {
  targetFileHandle = handle;
  isServerBackedFile = false;
  targetFilePath = name;

  const editor = $('editor');
  if (editor) editor.value = text;
  clearDirty();
  setText('file-label', name);
  history.replaceState(null, '', '#' + encodeURIComponent(name));

  const status = $('status');
  if (status) status.className = 'status-bar status-ok';
  const note = handle ? '' : ' <span class="muted">(il salvataggio creerà una nuova copia — questo browser non supporta la scrittura diretta)</span>';
  setHtml('status', '> File aperto: <span>' + escapeHtml(name) + '</span>' + note);
}

export async function loadTargetFile(path) {
  $('editorState').innerText = '● LOADING...';
  $('status').className = 'status-bar';
  $('status').innerText = '> Apertura file: ' + path;

  try {
    const r = await fetch(LOCAL_SERVER + '/load', { method: 'GET', headers: { 'X-File-Path': encodeURIComponent(path) } });
    const text = await r.text();
    if (r.status === 404) throw new Error('FILE_NOT_FOUND');
    if (!r.ok) throw new Error('HTTP ' + r.status + (text ? ' — ' + text : ''));

    $('editor').value = text;
    clearDirty();
    isServerBackedFile = true;
    $('editorState').innerText = '● LOADED';
    $('status').className = 'status-bar status-ok';
    $('status').innerText = '> File caricato correttamente | ' + path;
  } catch (e) {
    $('editorState').innerText = '● LOAD ERROR';
    $('status').className = 'status-bar status-error';
    if (e.message === 'FILE_NOT_FOUND') $('status').innerText = '> FILE NON TROVATO: ' + path;
    else if (e instanceof TypeError) $('status').innerHTML = '> SERVER LOCALE OFFLINE | Usa <b>Apri File</b> per aprirlo comunque, o <b>Salva Come</b> per crearne uno nuovo.';
    else $('status').innerText = '> ERRORE APERTURA: ' + e.message;
  }
}

export async function checkServer() {
  try {
    const r = await fetch(LOCAL_SERVER + '/', { method: 'GET' });
    $('serverState').innerText = r.ok ? '● ONLINE' : '● HTTP ' + r.status;
  } catch {
    $('serverState').innerText = '● OFFLINE';
    $('serverState').className = 'monitor-value alarm';
  }
}

/** Resolves the file path encoded in location.hash (used when opened via the launcher). */
export function resolveTargetFileFromHash() {
  const hash = location.hash.substring(1);
  if (!hash) return null;
  try { return decodeURIComponent(hash); } catch { return hash; }
}

export function setTargetFilePath(path) {
  targetFilePath = path;
}
