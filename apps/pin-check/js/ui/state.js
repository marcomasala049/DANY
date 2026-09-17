/**
 * Single shared mutable store for the current session — which connector is
 * selected and the test-sequence rows (each a planned/measured pin-to-pin
 * check). Every ui/*.js module reads/writes through this one object.
 */
export const state = {
  connectorId: null,
  /** {id, pinA, pinB, measureTypeId, expectedValue, tolerance, notes, measuredValue, measuredAt, result} */
  steps: [],
  selectedStepId: null
};

let nextStepId = 1;

export function nextId() {
  return nextStepId++;
}
