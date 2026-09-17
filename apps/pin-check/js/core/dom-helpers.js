import { $ as byId } from '../../../../shared/js/dom-utils.js';

/** Pin-check-local shorthand: document.getElementById bound to the current document. */
export const $ = id => byId(id, document);
