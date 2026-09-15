import { $ } from '../core/dom-helpers.js';
import { convert, conversionMap } from '../logic/unit-conversions.js';

/** Reads convType/convValue, writes the converted value + label to the form. */
export function convertUnits() {
  const type = $('convType').value;
  const value = parseFloat($('convValue').value);
  const converted = convert(type, value);
  if (!converted) { $('convResult').value = '-'; return; }
  $('convResult').value = converted.value;
  $('convUnitsLabel').innerText = converted.label;
}

/** Swaps the conversion direction (e.g. mm➔in becomes in➔mm) and re-converts. */
export function swapConversion() {
  const current = $('convType').value;
  const swapped = conversionMap[current];
  if (!swapped) return;

  const previousOutput = $('convResult').value;
  $('convType').value = swapped;
  if (!isNaN(parseFloat(previousOutput))) $('convValue').value = previousOutput;
  convertUnits();
}
