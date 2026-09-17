import { $ } from '../core/dom-helpers.js';
import { escapeHtml } from '../../../../shared/js/dom-utils.js';
import { daniIcon } from '../../../../shared/js/dani-icons.js';
import { stepStatus, getRepositionBadge } from '../logic/steps.js';
import { state } from './state.js';
import { openModal } from './modal.js';

let selectedSummaryRow = -1;

export function renderSummary() {
  const body = $('summaryBody');
  body.innerHTML = '';

  state.steps.forEach((s, i) => {
    const st = stepStatus(s);
    const tr = document.createElement('tr');
    tr.className = i === selectedSummaryRow ? 'selected' : '';

    let statusHtml = '';
    if (st === 'skipped') statusHtml = '<span class="status-skipped">' + daniIcon('arrow-right', { size: 13 }) + '<span>Skipped</span></span>';
    else if (st === 'signed') statusHtml = '<span class="status-signed">' + daniIcon('check', { size: 13 }) + '<span>' + escapeHtml(s.signature) + '</span></span>';
    else statusHtml = '<span class="status-pending">' + daniIcon('step', { size: 13 }) + '<span>Da compilare</span></span>';

    const badge = getRepositionBadge(s);
    if (badge) {
      statusHtml += badge.kind === 'executed'
        ? ' <span class="badge-repositioned executed" title="Step originariamente saltato e firmato prima dello Step ' + escapeHtml(badge.target) + '">' + daniIcon('swap', { size: 12 }) + '<span>eseguito prima di Step ' + escapeHtml(badge.target) + '</span></span>'
        : ' <span class="badge-repositioned pending" title="Da eseguire prima dello Step ' + escapeHtml(badge.target) + '">' + daniIcon('swap', { size: 12 }) + '<span>da eseguire prima di Step ' + escapeHtml(badge.target) + '</span></span>';
    }

    if (s.correction && s.correction.trim()) statusHtml += ' <span class="status-modified">' + daniIcon('edit', { size: 13 }) + '</span>';

    const tdStep = document.createElement('td');
    tdStep.textContent = s.step;

    const tdDesc = document.createElement('td');
    const desc = s.desc || '';
    tdDesc.textContent = desc.length > 90 ? desc.slice(0, 90) + '…' : desc;

    const tdStatus = document.createElement('td');
    tdStatus.innerHTML = statusHtml;

    tr.append(tdStep, tdDesc, tdStatus);
    tr.onclick = () => selectSummaryRow(i);
    tr.ondblclick = () => openStepDetail(i);
    body.appendChild(tr);
  });
}

export function selectSummaryRow(i) {
  selectedSummaryRow = i;
  const s = state.steps[i];

  $('prevTitle').innerHTML = daniIcon('search', { size: 14 }) + '<span>Dettagli Passo N° ' + escapeHtml(s.step) + '</span>';
  $('prevBody').innerText =
    'Descrizione: ' + (s.desc || '—') + '\n\n' +
    'Atteso: ' + (s.expected || '—') + '\n' +
    'Misurato: ' + (s.measured || '—') + '\n\n' +
    'Note: ' + (s.notes || '—') +
    (s.correction ? '\n\nProposta modifica:\n' + s.correction : '') +
    (s.anomaly ? '\n\nAnomalia: ' + s.anomaly : '') +
    (s.skipReason ? '\n\nMotivo salto: ' + s.skipReason : '');

  renderSummary();
}

export function openStepDetail(i) {
  const s = state.steps[i];
  $('detailTitle').innerText = 'Dettaglio Passo ' + s.step;
  $('detailText').innerText =
    'Descrizione:\n' + (s.desc || '—') +
    '\n\nAtteso:\n' + (s.expected || '—') +
    '\n\nMisurato:\n' + (s.measured || '—');
  openModal('modalDetail');
}
