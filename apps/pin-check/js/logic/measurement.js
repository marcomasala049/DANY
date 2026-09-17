/**
 * Pure PASS/FAIL evaluation for one measurement — no DOM, fully unit-testable.
 * Expected value and tolerance are both optional (per spec: don't require
 * them); PASS/FAIL is only ever computed when both are present and the
 * value is actually comparable, otherwise the caller gets null and leaves
 * the result blank rather than guessing.
 */

/** "5%" -> {kind:'percent',value:5}; "0.5" -> {kind:'absolute',value:0.5}; blank/invalid -> null. */
export function parseTolerance(raw) {
  const text = (raw ?? '').toString().trim();
  if (!text) return null;
  if (text.endsWith('%')) {
    const value = parseFloat(text.slice(0, -1).replace(',', '.'));
    return isNaN(value) ? null : { kind: 'percent', value };
  }
  const value = parseFloat(text.replace(',', '.'));
  return isNaN(value) ? null : { kind: 'absolute', value };
}

/**
 * @param measureType one of data/measure-types.js's MEASURE_TYPES entries
 * @returns 'pass'|'fail'|null — null when it isn't computable (missing
 *   measured/expected value, non-numeric type without a matching option, or
 *   no usable tolerance for a numeric type).
 */
export function evaluateResult(measureType, measuredValue, expectedValue, toleranceRaw) {
  const measured = (measuredValue ?? '').toString().trim();
  const expected = (expectedValue ?? '').toString().trim();
  if (!measured || !expected) return null;

  if (measureType && measureType.inputType === 'select') {
    return measured === expected ? 'pass' : 'fail';
  }

  const measuredNum = parseFloat(measured.replace(',', '.'));
  const expectedNum = parseFloat(expected.replace(',', '.'));
  if (isNaN(measuredNum) || isNaN(expectedNum)) return null;

  const tolerance = parseTolerance(toleranceRaw);
  if (!tolerance) return null;

  const allowed = tolerance.kind === 'percent'
    ? Math.abs(expectedNum) * (tolerance.value / 100)
    : tolerance.value;

  return Math.abs(measuredNum - expectedNum) <= allowed ? 'pass' : 'fail';
}
