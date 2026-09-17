import { $ } from '../core/dom-helpers.js';
import { nowStamp } from '../core/time.js';
import {
  evaluateMeasurement, appendNoteLine, buildSkipReason, extractSkipReasonText,
  skipTargetOptions, findPendingRepositioned
} from '../logic/steps.js';
import { state } from './state.js';
import { saveSession } from './session-storage.js';
import { openModal, closeModal } from './modal.js';
import { renderSummary } from './summary.js';
import { evaluateEnd } from './end-screen.js';

// Set only while the anomaly/skip modals are open on behalf of a *linked*
// (repositioned) step's inline panel, rather than the current step — null
// otherwise. See buildLinkedStepBlock/signLinkedStep below.
let anomalyTargetIndex = null;
let reSkipTargetIndex = null;

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

  renderLinkedSkipAlert(s);

  $('stepTitle').innerText = 'STEP N° ' + s.step;
  $('stepProgress').innerText = (state.currentIndex + 1) + ' / ' + state.steps.length;
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

/** Shows/hides the "step(s) repositioned before this one" banner and its linked-step panels. */
function renderLinkedSkipAlert(currentStep) {
  const alertBox = $('linkedSkipAlert');
  const pending = findPendingRepositioned(state.steps, currentStep.step);

  if (!pending.length) {
    alertBox.style.display = 'none';
    return;
  }

  alertBox.style.display = 'block';
  const container = $('linkedSkipSteps');
  container.innerHTML = '';
  pending.forEach(({ stepData, originalIndex }) => {
    container.appendChild(buildLinkedStepBlock(stepData, originalIndex));
  });
}

function lsbPanel(title, body, color) {
  const p = document.createElement('div');
  p.className = 'lsb-panel';
  const t = document.createElement('div');
  t.className = 'lsb-panel-title';
  t.textContent = title;
  const b = document.createElement('div');
  b.className = 'lsb-panel-body';
  if (color) b.style.color = color;
  b.textContent = body;
  p.append(t, b);
  return p;
}

/** One inline panel letting the operator sign, re-skip or jump to a step repositioned before the current one. */
function buildLinkedStepBlock(stepData, originalIndex) {
  const block = document.createElement('div');
  block.className = 'linked-step-block';

  const title = document.createElement('div');
  title.className = 'lsb-title';
  title.textContent = '▶ STEP N° ' + stepData.step + ' — da eseguire ora';
  block.appendChild(title);

  block.appendChild(lsbPanel('Descrizione Operativa', stepData.desc || '—'));
  if (stepData.expected) block.appendChild(lsbPanel('Valore Atteso', stepData.expected));
  if (stepData.skipReason) block.appendChild(lsbPanel('Motivo del riposizionamento', stepData.skipReason, 'var(--text-secondary)'));

  if (stepData.image && stepData.image.trim()) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'lsb-panel';
    const t = document.createElement('div');
    t.className = 'lsb-panel-title';
    t.textContent = 'Immagine di riferimento';
    const img = document.createElement('img');
    img.src = stepData.image.trim();
    img.style.cssText = 'max-width:100%;max-height:240px;border-radius:4px;margin-top:4px;display:block';
    imgWrap.append(t, img);
    block.appendChild(imgWrap);
  }

  const inputsWrap = document.createElement('div');
  inputsWrap.className = 'lsb-panel';

  const lblM = document.createElement('span');
  lblM.className = 'field-label';
  lblM.textContent = 'Valore Misurato';
  const inpM = document.createElement('input');
  inpM.type = 'text';
  inpM.className = 'field-input';
  inpM.id = 'linkedMeasured_' + originalIndex;
  inpM.value = stepData.measured || '';

  const lblN = document.createElement('span');
  lblN.className = 'field-label';
  lblN.textContent = 'Aggiungi Nota';
  const inpN = document.createElement('input');
  inpN.type = 'text';
  inpN.className = 'field-input';
  inpN.id = 'linkedNote_' + originalIndex;

  inputsWrap.append(lblM, inpM, lblN, inpN);
  block.appendChild(inputsWrap);

  const actions = document.createElement('div');
  actions.className = 'lsb-actions';

  const btnSign = document.createElement('button');
  btnSign.className = 'btn btn-primary';
  btnSign.textContent = '✍ Firma e Chiudi questo Step';
  btnSign.onclick = () => signLinkedStep(originalIndex);

  const btnReskip = document.createElement('button');
  btnReskip.className = 'btn btn-warn';
  btnReskip.textContent = '⏭ Salta di nuovo';
  btnReskip.title = 'Cambia motivo e/o punto di riposizionamento di questo step';
  btnReskip.onclick = () => openReSkipModal(originalIndex);

  const btnJump = document.createElement('button');
  btnJump.className = 'btn btn-accent';
  btnJump.textContent = '↪ Apri in vista completa';
  btnJump.onclick = () => { state.currentIndex = originalIndex; renderStep(); };

  actions.append(btnSign, btnReskip, btnJump);
  block.appendChild(actions);

  return block;
}

/** "✍ Firma e Chiudi questo Step" on a linked panel — same anomaly check as the main flow. */
function signLinkedStep(originalIndex) {
  if (!state.username) {
    alert('Inserisci il nome operatore in alto prima di firmare uno step.');
    $('usernameField').focus();
    return;
  }

  const s = state.steps[originalIndex];
  if (!s) return;

  const inpM = $('linkedMeasured_' + originalIndex);
  const inpN = $('linkedNote_' + originalIndex);
  const measuredStr = inpM ? inpM.value.trim() : '';
  const newNote = inpN ? inpN.value.trim() : '';

  const evaluation = evaluateMeasurement(s.expected, measuredStr);
  if (evaluation.kind === 'invalid-number') {
    alert('Errore: il valore inserito ("' + evaluation.measuredStr + '") non è un numero valido.\nPer questo passo è richiesto un riscontro numerico.');
    return;
  }
  if (evaluation.kind === 'anomaly' && !(s.anomaly && s.anomaly.trim())) {
    anomalyTargetIndex = originalIndex;
    $('anomalyText').innerText = 'Anomalia: il valore misurato (' + evaluation.measuredNum + ') supera il 5% rispetto all\'atteso (' + evaluation.expectedNum + ').';
    $('anomalyReasonInput').value = '';
    openModal('modalAnomaly');
    return;
  }

  applyLinkedSign(originalIndex, measuredStr, newNote);
}

function applyLinkedSign(originalIndex, measuredStr, newNote) {
  const s = state.steps[originalIndex];

  s.measured = measuredStr;
  if (newNote) s.notes = appendNoteLine(s.notes, '[' + nowStamp() + ' - ' + state.username + ']: ' + newNote);

  // Keep the skip reason in the note history for traceability once the step is signed.
  if (s.skipReason && s.skipReason.trim()) {
    s.notes = appendNoteLine(s.notes, '[STORICO RIPOSIZIONAMENTO] ' + s.skipReason);
  }

  s.timestamp = nowStamp();
  s.signature = state.username;
  s.skipReason = '';

  saveSession();
  renderStep(); // the banner updates itself since it's no longer pending

  if ($('paneSummary').classList.contains('active')) renderSummary();
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
  if (newNote) s.notes = appendNoteLine(s.notes, '[' + nowStamp() + ' - ' + state.username + ']: ' + newNote);

  // If this step had been repositioned, keep the skip reason in the note history for traceability.
  if (s.repositionedTo && s.skipReason && s.skipReason.trim()) {
    s.notes = appendNoteLine(s.notes, '[STORICO RIPOSIZIONAMENTO] ' + s.skipReason);
  }

  s.timestamp = nowStamp();
  s.signature = state.username;
  s.skipReason = '';
  // s.repositionedTo is intentionally left in place — the summary badge needs it to show
  // this step ran out of order, even after it's been signed.

  saveSession();
  state.currentIndex++;
  renderStep();
}

function populateSkipTargetSelect(excludeIndexes, selectedStep) {
  const select = $('skipTargetStepSelect');
  select.innerHTML = '<option value="">-- Nessun vincolo di riposizionamento --</option>';
  skipTargetOptions(state.steps, excludeIndexes).forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.step;
    opt.textContent = 'Step ' + o.step + (o.desc ? ' - ' + o.desc.slice(0, 40) + '…' : '');
    if (selectedStep != null && String(o.step) === String(selectedStep)) opt.selected = true;
    select.appendChild(opt);
  });
}

export function openSkipModal() {
  reSkipTargetIndex = null;
  $('skipReasonInput').value = '';
  $('skipModalTitle').textContent = '⏭ Salta Passaggio';
  $('skipModalText').textContent = 'Motiva perché stai saltando questo step (obbligatorio):';
  populateSkipTargetSelect([state.currentIndex], null);
  openModal('modalSkip');
}

/** "⏭ Salta di nuovo" from a linked-step panel — reopens the skip modal to change reason/target. */
function openReSkipModal(originalIndex) {
  const s = state.steps[originalIndex];
  if (!s) return;

  reSkipTargetIndex = originalIndex;
  $('skipReasonInput').value = extractSkipReasonText(s.skipReason);
  $('skipModalTitle').textContent = '⏭ Salta di nuovo — Step ' + s.step;
  $('skipModalText').textContent = 'Modifica motivo e/o punto di riposizionamento dello Step ' + s.step + ':';
  populateSkipTargetSelect([originalIndex, state.currentIndex], s.repositionedTo);
  openModal('modalSkip');
}

export function confirmSkip() {
  const isReskip = reSkipTargetIndex !== null;
  if (!isReskip && state.currentIndex >= state.steps.length) return;

  const reason = $('skipReasonInput').value.trim();
  const targetStep = $('skipTargetStepSelect').value;
  if (!reason) { alert('È obbligatorio inserire una motivazione per poter saltare lo step.'); return; }

  const s = isReskip ? state.steps[reSkipTargetIndex] : state.steps[state.currentIndex];
  if (!s) return;

  // Warn if the chosen recovery target is a step already passed.
  if (targetStep) {
    const targetIdx = state.steps.findIndex(x => String(x.step) === String(targetStep));
    if (targetIdx !== -1 && targetIdx < state.currentIndex) {
      const proceed = confirm(
        '⚠ Attenzione\n\nLo Step ' + targetStep + ' è già stato superato (posizione ' + (targetIdx + 1) +
        ', mentre sei allo step ' + (state.currentIndex + 1) + ').\n\n' +
        'Lo step riposizionato non comparirà in nessun banner futuro: verrà considerato saltato definitivamente.\n\nProcedere comunque?'
      );
      if (!proceed) return;
    }
  }

  // Keep a record of the previous recovery target when a re-skip changes it.
  if (isReskip && s.repositionedTo && String(s.repositionedTo) !== String(targetStep)) {
    s.notes = appendNoteLine(
      s.notes,
      '[RIPOSIZIONAMENTO PRECEDENTE] verso Step ' + s.repositionedTo + (s.repositionedAt ? ' (assegnato il ' + s.repositionedAt + ')' : '')
    );
  }

  s.skipReason = buildSkipReason(nowStamp(), reason, targetStep);
  s.signature = '';
  s.timestamp = nowStamp();

  if (targetStep) {
    s.repositionedTo = String(targetStep);
    s.repositionedAt = nowStamp();
  } else {
    delete s.repositionedTo;
    delete s.repositionedAt;
  }

  closeModal('modalSkip');
  reSkipTargetIndex = null;
  saveSession();

  if (isReskip) {
    renderStep(); // stay on the current step; its banner refreshes itself
  } else {
    state.currentIndex++;
    renderStep();
  }

  if ($('paneSummary').classList.contains('active')) renderSummary();
}

export function prevStep() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderStep();
  }
}

export function confirmAnomaly() {
  if (state.currentIndex >= state.steps.length && anomalyTargetIndex === null) return;

  const reason = $('anomalyReasonInput').value.trim();
  if (!reason) { alert('Inserisci una motivazione per l\'anomalia.'); return; }

  const idx = anomalyTargetIndex !== null ? anomalyTargetIndex : state.currentIndex;
  state.steps[idx].anomaly = '[ANOMALIA 5%] ' + reason;

  closeModal('modalAnomaly');

  if (anomalyTargetIndex !== null) {
    const savedIdx = anomalyTargetIndex;
    const inpM = $('linkedMeasured_' + savedIdx);
    const inpN = $('linkedNote_' + savedIdx);
    const measuredStr = inpM ? inpM.value.trim() : '';
    const newNote = inpN ? inpN.value.trim() : '';
    anomalyTargetIndex = null;
    applyLinkedSign(savedIdx, measuredStr, newNote);
  } else {
    performSave();
  }
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
