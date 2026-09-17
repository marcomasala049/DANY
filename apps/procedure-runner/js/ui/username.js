import { $ } from '../core/dom-helpers.js';
import { state } from './state.js';
import { setOperatorName } from '../../../../shared/js/operator.js';

export function onUsernameChange() {
  state.username = setOperatorName($('usernameField').value);
}
