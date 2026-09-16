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

/** Appends `line` to `notes` (newline-separated), or returns `line` alone when notes is empty. */
export function appendNoteLine(notes, line) {
  return notes && notes.trim() ? notes + '\n' + line : line;
}

/** Formats the skipReason stored on a step, optionally recording a recovery target step. */
export function buildSkipReason(timestamp, reason, targetStep) {
  let text = '[' + timestamp + '] SALTATO: ' + reason;
  if (targetStep) text += ' (In realtà da eseguire prima dello STEP ' + targetStep + ')';
  return text;
}

/**
 * Recovers the free-text reason an operator typed from a stored skipReason —
 * strips the timestamp/"SALTATO:" prefix and the recovery-target suffix —
 * so a re-skip can re-populate the reason field with just their own words.
 */
export function extractSkipReasonText(skipReason) {
  let text = skipReason || '';
  text = text.replace(/^\[.*?\]\s*SALTATO:\s*/, '');
  text = text.replace(/\s*\(In realtà da eseguire prima dello STEP [^)]+\)\s*$/, '');
  return text.trim();
}

/** Steps eligible as a skip's recovery target: every step except those at `excludeIndexes`. */
export function skipTargetOptions(steps, excludeIndexes) {
  const excluded = new Set(excludeIndexes);
  return steps
    .map((s, idx) => ({ step: s.step, desc: s.desc, idx }))
    .filter(o => !excluded.has(o.idx));
}

/** {stepData, originalIndex} for every step currently skipped-and-waiting-to-run before `targetStep`. */
export function findPendingRepositioned(steps, targetStep) {
  return steps
    .map((stepData, originalIndex) => ({ stepData, originalIndex }))
    .filter(({ stepData }) => stepStatus(stepData) === 'skipped' && String(stepData.repositionedTo || '') === String(targetStep));
}

/**
 * The recovery-target step id for a step, read from the explicit field or —
 * for data saved/imported before repositionedTo existed, or round-tripped
 * through a CSV/XLSX export that only carries the skipReason text — parsed
 * back out of that text. Returns null when the step was never repositioned.
 */
export function repositionTargetOf(step) {
  if (step.repositionedTo) return String(step.repositionedTo);
  const m = (step.skipReason || '').match(/\(In realtà da eseguire prima dello STEP ([^)]+)\)/);
  return m ? m[1] : null;
}

/** {kind:'executed'|'pending', target} badge info for the summary table, or null if not repositioned. */
export function getRepositionBadge(step) {
  const target = repositionTargetOf(step);
  if (!target) return null;
  const status = stepStatus(step);
  if (status === 'signed') return { kind: 'executed', target };
  if (status === 'skipped') return { kind: 'pending', target };
  return null;
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
