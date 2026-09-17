import { STORAGE_KEY as TODOS_KEY } from './todo.js';
import { getWidgetEntries, isWidgetVisible } from './widgets.js';
import { widgetStorageKey, widgetKeyFromTitle } from '../logic/widget-storage-keys.js';

const PERSISTED_KEYS = [TODOS_KEY];

/** Downloads a .json snapshot of todos and widget layout. */
export function exportWorkspaceState() {
  const state = {};
  PERSISTED_KEYS.forEach(key => {
    const v = localStorage.getItem(key);
    if (v) try { state[key] = JSON.parse(v); } catch { /* skip malformed entry */ }
  });

  const collapse = {};
  document.querySelectorAll('.widget-title').forEach(t => {
    const key = 'widget_' + widgetKeyFromTitle(t.querySelector('.title-text').innerText);
    const v = localStorage.getItem(key);
    if (v) collapse[key] = v;
  });
  state._widgetCollapse = collapse;

  const visibility = {};
  getWidgetEntries().forEach(({ title }) => { visibility[title] = isWidgetVisible(title); });
  state._widgetVisibility = visibility;

  state._exportedAt = new Date().toISOString();

  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'workspace_state_' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Restores a snapshot produced by exportWorkspaceState(), then reloads the page. */
export async function importWorkspaceState(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const state = JSON.parse(await file.text());

    PERSISTED_KEYS.forEach(key => {
      if (state[key] !== undefined) localStorage.setItem(key, JSON.stringify(state[key]));
    });

    if (state._widgetCollapse) {
      Object.entries(state._widgetCollapse).forEach(([k, v]) => localStorage.setItem(k, v));
    }
    if (state._widgetVisibility) {
      Object.entries(state._widgetVisibility).forEach(([title, v]) => localStorage.setItem(widgetStorageKey(title), v ? '1' : '0'));
    }

    alert('Stato importato correttamente. La pagina verrà ricaricata.');
    location.reload();
  } catch (err) {
    alert('File di stato non valido: ' + err.message);
  }
}
