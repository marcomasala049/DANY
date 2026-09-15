import { $, setText, setHtml } from '../core/dom-helpers.js';
import { escapeHtml } from '../../../../shared/js/dom-utils.js';
import { isSessionRunning, appendSession } from './session.js';

const LOCAL_SERVER = 'http://127.0.0.1:8080';

let targetFilePath = '';
let selectedSaveDirectory = null;
let targetFileHandle = null;
let saveCount = 0;

export function getTargetFilePath() {
  return targetFilePath;
}

function makeSaveStamp() {
  return '[SALVATAGGIO ' + new Date().toLocaleString('it-IT') + ']';
}

/**
 * Cosmetic UI updates only: if anything here fails (missing element, timing…)
 * it must NOT make the save look like it failed, since the file has already
 * been written to disk successfully by this point.
 */
function afterSaveUI(path, stamped) {
  try {
    const editor = $('editor');
    if (editor) editor.value = stamped; else console.error('[afterSaveUI] elemento mancante: #editor');
    targetFilePath = path;
    setText('file-label', path);
    saveCount++;
    setText('saveState', new Date().toLocaleTimeString('it-IT'));

    const status = $('status');
    if (status) status.className = 'status-bar status-ok';
    setHtml('status', '> File salvato: <span>' + escapeHtml(path) + '</span> | ' + new Date().toLocaleTimeString('it-IT'));

    if (isSessionRunning()) appendSession('SAVE ' + new Date().toLocaleTimeString('it-IT'));
  } catch (uiErr) {
    console.error('[afterSaveUI] aggiornamento interfaccia fallito (il file però è stato salvato correttamente):', uiErr);
  }
}

async function writeFile(path, addStamp = true) {
  const editorEl = $('editor');
  if (!editorEl) throw new Error('Elemento #editor non trovato nel DOM: impossibile leggere il testo da salvare.');

  const original = editorEl.value;
  const base = original.trimEnd();
  const stamped = addStamp ? (base ? base + '\n' : '') + makeSaveStamp() : original;

  if (targetFileHandle) {
    const writable = await targetFileHandle.createWritable();
    await writable.write(stamped);
    await writable.close();
    afterSaveUI(path, stamped);
    return stamped;
  }

  const r = await fetch(LOCAL_SERVER + '/save', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-File-Path': encodeURIComponent(path) },
    body: stamped
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);

  afterSaveUI(path, stamped);
  return stamped;
}

export async function salvaFile() {
  if (!targetFilePath) { salvaCome(); return; }
  try {
    await writeFile(targetFilePath, true);
  } catch (e) {
    console.error('[salvaFile] salvataggio effettivo fallito:', e);
    const status = $('status');
    if (status) { status.className = 'status-bar status-error'; status.innerText = '> Errore salvataggio: ' + e.message; }
    alert('Errore durante il salvataggio: ' + e.message);
  }
}

export function salvaCome() {
  $('saveModal').classList.add('show');
  selectedSaveDirectory = null;
  targetFileHandle = null;
  $('saveFolderStatus').innerText = 'Desktop — predefinito';
  $('saveFolderStatus').classList.add('default');
  $('newFileName').focus();
  $('newFileName').select();
}

export function chiudiSalvaCome() {
  $('saveModal').classList.remove('show');
}

export async function selezionaCartellaSalvataggio() {
  if (!window.showDirectoryPicker) {
    alert('La selezione della cartella non è supportata da questa versione di Edge. Il file verrà comunque salvato sul Desktop se lasci la cartella predefinita.');
    return;
  }
  try {
    selectedSaveDirectory = await window.showDirectoryPicker({ mode: 'readwrite' });
    $('saveFolderStatus').innerText = '📁 ' + selectedSaveDirectory.name;
    $('saveFolderStatus').classList.remove('default');
  } catch (e) {
    if (e.name !== 'AbortError') alert('Impossibile selezionare la cartella: ' + e.message);
  }
}

export async function confermaSalvaCome() {
  let name = $('newFileName').value.trim();
  if (!name) { alert('Inserisci un nome file.'); return; }
  if (!/\.txt$/i.test(name)) name += '.txt';

  try {
    if (selectedSaveDirectory) {
      targetFileHandle = await selectedSaveDirectory.getFileHandle(name, { create: true });
      const folderPath = selectedSaveDirectory.name + '\\' + name;
      await writeFile(folderPath, true);
      history.replaceState(null, '', '#' + encodeURIComponent(folderPath));
    } else {
      targetFileHandle = null;
      await writeFile(name, true);
      history.replaceState(null, '', '#' + encodeURIComponent(name));
    }
    chiudiSalvaCome();
  } catch (e) {
    console.error('[confermaSalvaCome] creazione/salvataggio file fallito:', e);
    targetFileHandle = null;
    const status = $('status');
    if (status) { status.className = 'status-bar status-error'; status.innerText = '> Errore creazione file: ' + e.message; }
    alert('Impossibile creare il file: ' + e.message);
  }
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
    $('editorState').innerText = '● LOADED';
    $('status').className = 'status-bar status-ok';
    $('status').innerText = '> File caricato correttamente | ' + path;
  } catch (e) {
    $('editorState').innerText = '● LOAD ERROR';
    $('status').className = 'status-bar status-error';
    if (e.message === 'FILE_NOT_FOUND') $('status').innerText = '> FILE NON TROVATO: ' + path;
    else if (e instanceof TypeError) $('status').innerText = '> SERVER OFFLINE o richiesta bloccata | Avvia il tool tramite il .bat';
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
