/**
 * In-app replacements for the browser's native alert()/confirm()/prompt() —
 * those render as "this page says…" browser chrome, inconsistent with the
 * rest of DANI's design. These reuse the exact same .modal/.modal-box shell
 * already used everywhere else (see shared/css/dani-theme.css), so they
 * look like the rest of the app rather than like a website.
 *
 * All three are Promise-based (a custom overlay can't block synchronously
 * the way the native dialogs do) — call sites that did
 * `if (!confirm(...)) return;` become `if (!(await daniConfirm(...))) return;`
 * inside an async function. Semantics otherwise match the native versions:
 * daniConfirm resolves true/false, daniPrompt resolves the typed string or
 * null on cancel, daniAlert always resolves once dismissed.
 */
import { daniIcon } from './dani-icons.js';

let overlay = null;

function ensureOverlay() {
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'modal dani-dialog-overlay';
  overlay.innerHTML =
    '<div class="modal-box dani-dialog-box">' +
      '<div class="modal-title dani-dialog-icon"></div>' +
      '<div class="modal-text dani-dialog-text"></div>' +
      '<div class="dani-dialog-input-wrap" hidden><input type="text" class="field-input dani-dialog-input"></div>' +
      '<div class="modal-actions dani-dialog-actions"></div>' +
    '</div>';
  document.body.appendChild(overlay);
  return overlay;
}

function showDialog({ title, message, icon, danger, showInput, defaultValue, okText, cancelText }) {
  return new Promise(resolve => {
    const el = ensureOverlay();
    const box = el.querySelector('.dani-dialog-box');
    const titleEl = el.querySelector('.dani-dialog-icon');
    const textEl = el.querySelector('.dani-dialog-text');
    const inputWrap = el.querySelector('.dani-dialog-input-wrap');
    const input = el.querySelector('.dani-dialog-input');
    const actions = el.querySelector('.dani-dialog-actions');

    box.classList.toggle('danger', !!danger);
    titleEl.innerHTML = daniIcon(icon || (danger ? 'warning' : 'info'), { size: 18 });
    const titleText = document.createElement('span');
    titleText.textContent = title;
    titleEl.appendChild(titleText);

    textEl.textContent = message ?? '';

    inputWrap.hidden = !showInput;
    input.value = defaultValue || '';

    actions.innerHTML = '';

    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      el.classList.remove('show');
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = e => {
      if (e.key === 'Escape') finish(showInput ? null : false);
      else if (e.key === 'Enter' && showInput) finish(input.value);
    };

    if (cancelText) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn';
      cancelBtn.textContent = cancelText;
      cancelBtn.onclick = () => finish(showInput ? null : false);
      actions.appendChild(cancelBtn);
    }

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
    okBtn.textContent = okText;
    okBtn.onclick = () => finish(showInput ? input.value : true);
    actions.appendChild(okBtn);

    document.addEventListener('keydown', onKey);
    el.classList.add('show');
    if (showInput) { input.focus(); input.select(); } else { okBtn.focus(); }
  });
}

/** Replaces window.alert(). Always resolves (no meaningful return value) once dismissed. */
export function daniAlert(message, { title = 'Attenzione', icon = 'info' } = {}) {
  return showDialog({ title, message, icon, okText: 'OK', cancelText: null });
}

/** Replaces window.confirm(). Resolves true (confirmed) or false (cancelled). */
export function daniConfirm(message, { title = 'Conferma', danger = false, okText = 'Conferma', cancelText = 'Annulla' } = {}) {
  return showDialog({ title, message, danger, okText, cancelText });
}

/** Replaces window.prompt(). Resolves the typed string, or null if cancelled. */
export function daniPrompt(message, { title = 'Inserisci un valore', defaultValue = '', okText = 'OK', cancelText = 'Annulla' } = {}) {
  return showDialog({ title, message, icon: 'edit', showInput: true, defaultValue, okText, cancelText });
}
