import { $ } from '../core/dom-helpers.js';
import { nowStamp } from '../core/time.js';
import { evaluateMeasurement } from '../logic/steps.js';
import { state } from './state.js';
import { saveSession } from './session-storage.js';
import { openModal, closeModal } from './modal.js';
import { renderSummary } from './summary.js';
import { evaluateEnd } from './end-screen.js';

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

export function switchTab(t) {
  document.querySelectorAll('.tabbtn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));

  if (t === 'exec') {
    $('tabBtnExec').classList.add('active');
    $('paneExec').classList.add('active');
  } else {
    $('tabBtnSummary').classList.add('active');
    $('paneSummary').classList.add('active');
    renderSummary();
  }
}

export function enterExecution() {
  $('usernameField').value = state.username;
  $('btnExportCsv').style.display = 'inline-block';
  $('btnExportXlsx').style.display = 'inline-block';

  if (state.currentIndex >= state.steps.length) { evaluateEnd(); return; }

  showScreen('screenExec');
  switchTab('exec');
  renderStep();
  updateProgress();
}

export function updateProgress() {
  const total = state.steps.length || 1;
  const pct = Math.min(100, Math.round((Math.min(state.currentIndex, state.steps.length) / total) * 100));
  $('progressFill').style.width = pct + '%';
}

export function renderStep() {
  if (state.currentIndex >= state.steps.length) { evaluateEnd(); return; }

  const s = state.steps[state.currentIndex];

  $('stepTitle').innerText = 'STEP N° ' + s.step;
  $('descBody').innerText = s.desc || '—';
  $('expectedBody').innerText = s.expected || '—';
  $('measuredInput').value = s.measured || '';
  $('noteInput').value = '';
  $('oldNotes').innerText = s.notes && s.notes.trim() ? s.notes : 'Nessuna nota.';

  renderImage(s);

  $('btnPrev').disabled = state.currentIndex <= 0;
  $('btnPrev').style.opacity = state.currentIndex <= 0 ? '.4' : '1';

  refreshSignatureUI();
  updateProgress();
}

function renderImage(s) {
  const panel = $('imagePanel');
  panel.innerHTML = '';

  if (!s.image || !s.image.trim()) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.innerHTML = 'Nessuna immagine di riferimento per questo step.<br>(aggiungi un URL nella colonna Immagine del CSV)';
    panel.appendChild(span);
    return;
  }

  const img = document.createElement('img');
  img.src = s.image.trim();
  img.alt = 'Immagine step ' + s.step;
  img.onerror = () => {
    panel.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = 'Immagine non raggiungibile: ' + s.image;
    panel.appendChild(span);
  };
  panel.appendChild(img);
}

function refreshSignatureUI() {
  if (state.currentIndex >= state.steps.length) return;

  const s = state.steps[state.currentIndex];
  const sig = (s.signature || '').trim();
  const btn = $('btnAction');
  const status = $('sigStatus');

  if (sig) {
    status.className = 'sig-status sig-signed';
    status.innerText = '✓ Approvato da: ' + sig;
    btn.innerText = 'Avanza (Già Firmato) ▶';
    btn.className = 'btn btn-accent';
  } else {
    status.className = 'sig-status sig-pending';
    status.innerText = '⚠ Stato: Non Firmato';
    btn.innerText = '✍ Firma e Successivo ▶';
    btn.className = 'btn btn-primary';
  }
}

function checkForModification() {
  if (state.currentIndex >= state.steps.length) return;

  const s = state.steps[state.currentIndex];
  if (s.signature && s.signature.trim()) {
    s.signature = '';
    s.skipReason = '';

    const status = $('sigStatus');
    const btn = $('btnAction');
    status.className = 'sig-status sig-remodify';
    status.innerText = '🔄 Modifica Rilevata! Richiesta Nuova Firma';
    btn.innerText = '✍ Rifirma e Avanza ▶';
    btn.className = 'btn btn-warn';

    saveSession();
  }
}

export function onMeasuredChange() {
  checkForModification();
}

export function onNoteChange() {
  checkForModification();
}

export function handleAction() {
  if (state.currentIndex >= state.steps.length) return;

  const s = state.steps[state.currentIndex];
  const measuredStr = $('measuredInput').value.trim();
  const evaluation = evaluateMeasurement(s.expected, measuredStr);

  if (evaluation.kind === 'invalid-number') {
    alert('Errore: il valore inserito ("' + evaluation.measuredStr + '") non è un numero valido.\nPer questo passo è richiesto un riscontro numerico.');
    return;
  }

  if (evaluation.kind === 'anomaly' && !(s.anomaly && s.anomaly.trim())) {
    $('anomalyText').innerText =
      'Anomalia: il valore misurato (' + evaluation.measuredNum + ') supera il 5% rispetto all\'atteso (' + evaluation.expectedNum + ').';
    $('anomalyReasonInput').value = '';
    openModal('modalAnomaly');
    return;
  }

  performSave();
}

function performSave() {
  if (!state.username) {
    alert('Inserisci il nome operatore in alto prima di firmare uno step.');
    $('usernameField').focus();
    return;
  }

  const s = state.steps[state.currentIndex];
  s.measured = $('measuredInput').value;

  const newNote = $('noteInput').value.trim();
  if (newNote) {
    const formatted = '[' + nowStamp() + ' - ' + state.username + ']: ' + newNote;
    s.notes = s.notes && s.notes.trim() ? s.notes + '\n' + formatted : formatted;
  }

  s.timestamp = nowStamp();
  s.signature = state.username;
  s.skipReason = '';

  saveSession();
  state.currentIndex++;
  renderStep();
}

export function openSkipModal() {
  $('skipReasonInput').value = '';
  openModal('modalSkip');
}

export function confirmSkip() {
  if (state.currentIndex >= state.steps.length) return;

  const reason = $('skipReasonInput').value.trim();
  if (!reason) { alert('È obbligatorio inserire una motivazione per poter saltare lo step.'); return; }

  const s = state.steps[state.currentIndex];
  s.skipReason = '[' + nowStamp() + '] SALTATO: ' + reason;
  s.signature = '';
  s.timestamp = nowStamp();

  closeModal('modalSkip');
  saveSession();

  state.currentIndex++;
  renderStep();
}

export function prevStep() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderStep();
  }
}

export function confirmAnomaly() {
  if (state.currentIndex >= state.steps.length) return;

  const reason = $('anomalyReasonInput').value.trim();
  if (!reason) { alert('Inserisci una motivazione per l\'anomalia.'); return; }

  state.steps[state.currentIndex].anomaly = '[ANOMALIA 5%] ' + reason;

  closeModal('modalAnomaly');
  performSave();
}

export function openCorrectionModal() {
  if (state.currentIndex >= state.steps.length) return;
  const s = state.steps[state.currentIndex];
  $('correctionInput').value = s.correction || s.desc || '';
  openModal('modalCorrection');
}

export function saveCorrection() {
  if (state.currentIndex >= state.steps.length) return;

  const value = $('correctionInput').value.trim();
  if (!value) { alert('La proposta di modifica non può essere vuota.'); return; }

  state.steps[state.currentIndex].correction = value;

  closeModal('modalCorrection');
  saveSession();
  renderStep();

  if ($('paneSummary').classList.contains('active')) renderSummary();
}
