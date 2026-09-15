import { $ } from '../core/dom-helpers.js';
import { scientificFormulas, ENGINEERING_TAB_EXCLUDED_CATEGORIES } from '../logic/formulas-data.js';

/** Populates both the Scientific Formula Library and the Engineering Tools "Formulas" tab. */
export function renderFormulas() {
  const fullList = $('scientificFormulaList');
  const compactList = $('engineeringFormulaList');
  fullList.innerHTML = '';
  compactList.innerHTML = '';

  scientificFormulas.forEach(([category, name, formula]) => {
    const card = document.createElement('div');
    card.className = 'formula-card';
    card.innerHTML = '<div class="formula-cat">' + category + '</div><span>' + name + ': </span><b>' + formula + '</b>';
    fullList.appendChild(card);

    if (!ENGINEERING_TAB_EXCLUDED_CATEGORIES.includes(category)) {
      compactList.appendChild(card.cloneNode(true));
    }
  });
}
