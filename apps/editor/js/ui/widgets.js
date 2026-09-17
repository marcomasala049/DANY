import { $ } from '../core/dom-helpers.js';
import { widgetKeyFromTitle, widgetStorageKey } from '../logic/widget-storage-keys.js';

const helpDescriptions = {
  'Sistema Orario': 'Mostra ora e data locali in tempo reale. Utile come riferimento durante test, misure e salvataggi.',
  'Convertitore Tecnico': 'Conversioni rapide per unita meccaniche, elettriche e di pressione: mm/in, kg/lb, N/kgf, N·m/in·lbf, RPM/rad/s, W/kW, bar/psi e altre.',
  'Promemoria Appunti': 'Lista TODO persistente nel browser. Aggiungi attivita, spuntale quando completate o cancellale.',
  'Calcolatrice Scientifica': 'Calcolatrice scientifica con modalita DEG/RAD, trigonometria, inverse trigonometriche, log, ln, radice, potenze e memoria.',
  'Engineering Tools': 'Calcolatori dedicati a motori, riduttori, caduta di tensione, potenza elettrica, termica e libreria formule. I valori inseriti restano modificabili.',
  'Quick Engineering Calculator': 'Calcolatore rapido per espressioni ingegneristiche. Supporta pi, pi greco, sqrt(), sin(), cos(), tan(), log(), ln(), abs() e potenze.',
  'System Monitor': 'Panoramica dello stato del server locale e dell editor. Esporta/importa lo stato del workspace (promemoria, widget collassati) come file .json per portarlo su un altra postazione.',
  'Trova & Sostituisci': 'Cerca una stringa nel testo (Enter o Ctrl/Cmd+F per il campo, poi Enter per il match successivo con wrap-around), sostituisci il match selezionato oppure sostituisci tutte le occorrenze con conteggio.',
  'Scientific Formula Library': 'Libreria rapida di formule scientifiche e ingegneristiche organizzate per meccanica, motori, gearbox, elettrica, termica, fluidi, dinamica e geometria.'
};

export function getWidgetEntries() {
  return Array.from(document.querySelectorAll('.right-panel>.widget'))
    .map((widget, index) => {
      const titleEl = widget.querySelector('.title-text');
      return titleEl ? { widget, title: widgetKeyFromTitle(titleEl.innerText), index } : null;
    })
    .filter(Boolean);
}

export function isWidgetVisible(title) {
  const v = localStorage.getItem(widgetStorageKey(title));
  return v === null ? true : v === '1';
}

/** Shows/hides each widget (and its group label, if every widget in the group is hidden). */
export function applyWidgetVisibility() {
  getWidgetEntries().forEach(({ widget, title }) => {
    widget.style.display = isWidgetVisible(title) ? '' : 'none';
  });

  document.querySelectorAll('.right-panel>.group-label').forEach(label => {
    let next = label.nextElementSibling;
    let hasVisible = false;
    while (next && !next.classList.contains('group-label')) {
      if (next.classList.contains('widget') && next.style.display !== 'none') { hasVisible = true; break; }
      next = next.nextElementSibling;
    }
    label.style.display = hasVisible ? '' : 'none';
  });
}

function setWidgetVisibility(title, visible) {
  localStorage.setItem(widgetStorageKey(title), visible ? '1' : '0');
  applyWidgetVisibility();
  renderWidgetManager();
}

function renderWidgetManager() {
  const list = $('widgetManagerList');
  if (!list) return;
  list.innerHTML = '';

  getWidgetEntries().forEach(({ title }) => {
    const label = document.createElement('label');
    label.className = 'widget-manager-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isWidgetVisible(title);
    checkbox.onchange = () => setWidgetVisibility(title, checkbox.checked);
    const span = document.createElement('span');
    span.textContent = title;
    label.append(checkbox, span);
    list.appendChild(label);
  });
}

export function openWidgetManager() {
  renderWidgetManager();
  $('widgetManagerModal').classList.add('show');
}

export function closeWidgetManager() {
  $('widgetManagerModal').classList.remove('show');
}

export function showAllWidgets() {
  getWidgetEntries().forEach(({ title }) => localStorage.setItem(widgetStorageKey(title), '1'));
  applyWidgetVisibility();
  renderWidgetManager();
}

export function hideAllWidgets() {
  getWidgetEntries().forEach(({ title }) => localStorage.setItem(widgetStorageKey(title), '0'));
  applyWidgetVisibility();
  renderWidgetManager();
}

/** Collapses/expands a widget body and remembers the state, keyed by the widget's stable title. */
export function toggleWidget(titleBarEl) {
  const widget = titleBarEl.closest('.widget');
  const collapsed = widget.classList.toggle('collapsed');
  titleBarEl.querySelector('.collapse-arrow').innerText = collapsed ? '▶' : '▼';
  const key = widgetKeyFromTitle(titleBarEl.querySelector('.title-text').innerText);
  localStorage.setItem('widget_' + key, collapsed ? '1' : '0');
}

/** Re-applies collapsed state saved by toggleWidget() on page load. */
export function restoreWidgetStates() {
  document.querySelectorAll('.widget-title').forEach(t => {
    const key = widgetKeyFromTitle(t.querySelector('.title-text').innerText);
    if (localStorage.getItem('widget_' + key) === '1') {
      t.closest('.widget').classList.add('collapsed');
      t.querySelector('.collapse-arrow').innerText = '▶';
    }
  });
}

export function addHelpButtons() {
  document.querySelectorAll('.widget-title').forEach(t => {
    if (t.querySelector('.help-btn')) return;
    const key = widgetKeyFromTitle(t.querySelector('.title-text').innerText);
    const btn = document.createElement('button');
    btn.className = 'help-btn';
    btn.type = 'button';
    btn.innerText = '?';
    btn.title = 'Aiuto';
    btn.onclick = e => { e.stopPropagation(); openHelp(key); };
    t.appendChild(btn);
  });
}

export function openHelp(key) {
  $('helpTitle').innerText = '> HELP — ' + key;
  $('helpText').innerText = helpDescriptions[key] || 'Questo widget fornisce una funzione tecnica del Terminal Workspace.';
  $('helpModal').classList.add('show');
}

export function closeHelp() {
  $('helpModal').classList.remove('show');
}

/** Wires the Escape key to close the widget manager modal. */
export function initWidgetManagerKeyboardShortcut() {
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWidgetManager(); });
}
