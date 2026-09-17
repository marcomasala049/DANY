/**
 * Measurement-type registry — the one place a new measurement type needs to
 * be added (id, label, default unit, and how the value should be entered).
 * `inputType` is either 'number' (free numeric entry) or 'select' (a fixed
 * set of `options`); logic/measurement.js and ui/sequence.js both read this
 * generically, so a new type needs no other code changes.
 */
export const MEASURE_TYPES = {
  resistance: { id: 'resistance', label: 'Resistance', unit: 'Ω', inputType: 'number' },
  voltage: { id: 'voltage', label: 'Voltage', unit: 'V', inputType: 'number' },
  continuity: {
    id: 'continuity',
    label: 'Continuity',
    unit: '',
    inputType: 'select',
    options: ['OK (continuità)', 'APERTO (nessuna continuità)']
  }
};

export const MEASURE_TYPE_LIST = Object.values(MEASURE_TYPES);

export function getMeasureType(id) {
  return MEASURE_TYPES[id] || null;
}
