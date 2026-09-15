import { $ } from '../core/dom-helpers.js';
import { state } from './state.js';

export function onUsernameChange() {
  state.username = $('usernameField').value.trim();
  localStorage.setItem('procrunner_username', state.username);
}
