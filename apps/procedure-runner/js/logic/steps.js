/**
 * Pure step-state rules: status classification, resume position and the
 * 5%-tolerance anomaly check used before a step can be signed.
 */

export function stepStatus(s) {
  if (s.skipReason && s.skipReason.trim()) return 'skipped';
  if (s.signature && s.signature.trim()) return 'signed';
  return 'pending';
}

/** Index of the first step that is neither signed nor skipped (steps.length if all are done). */
export function findFirstUnsigned(steps) {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const done = (s.signature && s.signature.trim() !== '') || (s.skipReason && s.skipReason.trim() !== '');
    if (!done) return i;
  }
  return steps.length;
}

/**
 * Compares a measured value against the step's expected value.
 * @returns {{kind:'not-numeric'}|{kind:'invalid-number',measuredStr:string}|{kind:'ok'|'anomaly',expectedNum:number,measuredNum:number}}
 *   'not-numeric'   — expected isn't a number, or nothing was measured: no check applies.
 *   'invalid-number'— expected is numeric but the typed value doesn't parse.
 *   'ok'            — within 5% of the expected value (or expected is 0).
 *   'anomaly'       — measured deviates from expected by more than 5%.
 */
export function evaluateMeasurement(expectedRaw, measuredRaw) {
  const expectedNum = parseFloat((expectedRaw || '').replace(',', '.'));
  const measuredStr = (measuredRaw || '').trim();

  if (isNaN(expectedNum) || !measuredStr) {
    return { kind: 'not-numeric' };
  }

  const measuredNum = parseFloat(measuredStr.replace(',', '.'));
  if (isNaN(measuredNum)) {
    return { kind: 'invalid-number', measuredStr };
  }

  const isAnomaly = expectedNum !== 0 && Math.abs(measuredNum - expectedNum) / Math.abs(expectedNum) > 0.05;
  return { kind: isAnomaly ? 'anomaly' : 'ok', expectedNum, measuredNum };
}

/** Aggregates sign/skip/correction counts for the end-of-run summary and reports. */
export function summarizeSteps(steps) {
  let countSigned = 0;
  let countSkipped = 0;
  let countModified = 0;
  const skippedList = [];
  const modifiedList = [];

  steps.forEach(s => {
    if (s.skipReason && s.skipReason.trim()) {
      countSkipped++;
      skippedList.push('• Passo ' + s.step + ' ⏭ Motivazione: ' + s.skipReason);
    } else if (s.signature && s.signature.trim()) {
      countSigned++;
    }

    if (s.correction && s.correction.trim()) {
      countModified++;
      modifiedList.push('• Passo ' + s.step + ' 📝 Testo modificato proposto');
    }
  });

  return { countSigned, countSkipped, countModified, skippedList, modifiedList };
}
