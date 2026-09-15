import { $ } from '../core/dom-helpers.js';
import { escapeHtml } from '../../../../shared/js/dom-utils.js';
import { detectDelimiter, isNumericCol, colStats } from '../logic/csv-data.js';

const MAX_LINES = 501;

let lastDataText = '';
let lastDataName = '';
let lastDataRows = null;

export async function inspectData(event) {
  const file = event.target.files[0];
  if (!file) return;
  lastDataName = file.name;
  lastDataText = await file.text();
  renderData();
}

export function reinspectData() {
  if (lastDataText) renderData();
}

export function renderData() {
  if (!lastDataText) return;

  const delim = $('dataDelimiter').value === 'auto' ? detectDelimiter(lastDataText) : $('dataDelimiter').value;
  const lines = lastDataText.split(/\r?\n/).filter(x => x.trim()).slice(0, MAX_LINES);
  if (!lines.length) return;

  const rows = lines.map(l => l.split(delim));
  const cols = Math.max(...rows.map(r => r.length));
  const previewN = Math.min(100, Math.max(1, +$('dataRows').value || 15));

  $('dataInfo').innerText = lastDataName + ' | ' + (lines.length - 1) + ' righe dati | ' + cols + ' colonne | delimiter ' +
    (delim === '\t' ? 'TAB' : delim) + (lines.length >= MAX_LINES ? ' | troncato a 500 righe' : '');

  const table = $('dataTable');
  table.innerHTML = '';
  const headers = [];
  const headRow = document.createElement('tr');
  for (let i = 0; i < cols; i++) {
    const name = rows[0][i] || ('CH' + (i + 1));
    headers.push(name);
    const th = document.createElement('th');
    th.innerText = name;
    headRow.appendChild(th);
  }
  table.appendChild(headRow);

  rows.slice(1, 1 + previewN).forEach(r => {
    const tr = document.createElement('tr');
    for (let i = 0; i < cols; i++) {
      const td = document.createElement('td');
      td.innerText = r[i] ?? '';
      tr.appendChild(td);
    }
    table.appendChild(tr);
  });

  const statsBox = $('dataStats');
  statsBox.innerHTML = '';
  const chartSel = $('dataChartCol');
  const chartSel2 = $('dataChartCol2');
  const prevChart = chartSel.value;
  const prevChart2 = chartSel2.value;
  chartSel.innerHTML = '<option value="">Grafico colonna — nessuna</option>';
  chartSel2.innerHTML = '<option value="">Confronta con — nessuna</option>';

  for (let i = 0; i < cols; i++) {
    if (!isNumericCol(rows, i)) continue;
    const st = colStats(rows, i);
    if (!st) continue;

    const card = document.createElement('div');
    card.className = 'data-stat-card';
    card.innerHTML =
      '<b>' + escapeHtml(headers[i]) + '</b>' +
      '<div class="data-stat-line"><span>min</span><span>' + st.min.toFixed(3) + '</span></div>' +
      '<div class="data-stat-line"><span>max</span><span>' + st.max.toFixed(3) + '</span></div>' +
      '<div class="data-stat-line"><span>media</span><span>' + st.mean.toFixed(3) + '</span></div>' +
      '<div class="data-stat-line"><span>σ</span><span>' + st.std.toFixed(3) + '</span></div>';
    statsBox.appendChild(card);

    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = headers[i];
    chartSel.appendChild(opt);
    chartSel2.appendChild(opt.cloneNode(true));
  }

  lastDataRows = rows;
  if (prevChart && [...chartSel.options].some(o => o.value === prevChart)) chartSel.value = prevChart;
  if (prevChart2 && [...chartSel2.options].some(o => o.value === prevChart2)) chartSel2.value = prevChart2;

  if (chartSel.value) drawDataChart();
  else $('dataChart').style.display = 'none';
}

export function exportCleanCsv() {
  if (!lastDataRows) { alert('Nessun dato caricato.'); return; }

  const csv = lastDataRows.map(r => r.map(v => {
    v = (v ?? '').toString();
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (lastDataName || 'data').replace(/\.[^.]+$/, '') + '_export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function drawDataChart() {
  const sel = $('dataChartCol');
  const sel2 = $('dataChartCol2');
  const canvas = $('dataChart');
  if (!sel.value || !lastDataRows) { canvas.style.display = 'none'; return; }

  const st = colStats(lastDataRows, +sel.value);
  if (!st || !st.vals.length) { canvas.style.display = 'none'; return; }

  let st2 = null;
  if (sel2.value) st2 = colStats(lastDataRows, +sel2.value);

  canvas.style.display = 'block';
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 300;
  const h = 90;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const drawSeries = (series, color, asLine) => {
    const vals = series.vals.slice(0, 300);
    const n = vals.length;
    const bw = w / n;
    const min = series.min;
    const range = (series.max - min) || 1;

    if (asLine) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      vals.forEach((v, i) => {
        const x = i * bw + bw / 2;
        const y = h - Math.max(1, ((v - min) / range) * (h - 8));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      vals.forEach((v, i) => {
        const bh = Math.max(1, ((v - min) / range) * (h - 8));
        ctx.fillRect(i * bw, h - bh, Math.max(1, bw - 1), bh);
      });
    }
  };

  drawSeries(st, '#00ff66', false);
  if (st2 && st2.vals.length) drawSeries(st2, '#67c7ff', true);

  ctx.strokeStyle = '#2a2a2a';
  ctx.strokeRect(0, 0, w, h);
}

/**
 * Redraws the chart when the window is resized/rotated. The canvas' pixel
 * buffer is sized from its container's clientWidth at draw time (see
 * drawDataChart above), so without this it would stay stretched to its old
 * size — deformed rather than responsive — after a resize/orientation change.
 */
export function initChartResize() {
  let pending = null;
  const scheduleRedraw = () => {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      pending = null;
      if ($('dataChartCol').value) drawDataChart();
    });
  };
  window.addEventListener('resize', scheduleRedraw);
  window.addEventListener('orientationchange', scheduleRedraw);
}
