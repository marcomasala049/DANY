import { $ } from '../core/dom-helpers.js';

export function openModal(id) {
  $(id).classList.add('show');
}

export function closeModal(id) {
  $(id).classList.remove('show');
}

export function closeAllModals() {
  document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
}

export function closeTab() {
  window.close();
  setTimeout(() => {
    if (!window.closed) alert('Puoi chiudere questa scheda manualmente.');
  }, 200);
}
