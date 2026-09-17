/**
 * Shared "operator" identity — the technician's name shown in the Home
 * welcome message and used as the default signer in Procedure Runner.
 *
 * Browsers have no API to read the signed-in Windows account name (that's
 * a hard security boundary, not a missing feature here) — so this stores
 * whatever name the operator types once, in one place both surfaces read
 * from, and lets it be changed at any time (Home's "Non sono io" button,
 * or editing Procedure Runner's own Operatore field).
 */
const STORAGE_KEY = 'dani_operator_name';
// Procedure Runner's own pre-existing per-app key — migrated once into the
// shared key below so nobody who already typed their name there loses it.
const LEGACY_KEY = 'procrunner_username';

export function getOperatorName() {
  try {
    const name = localStorage.getItem(STORAGE_KEY);
    if (name) return name;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {
    // localStorage unavailable (private browsing, quota, ...) - no name.
  }
  return '';
}

/** Stores the trimmed name (or clears it if blank) and returns the stored value. */
export function setOperatorName(name) {
  const trimmed = String(name ?? '').trim();
  try {
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable - the choice just won't persist.
  }
  return trimmed;
}

export function clearOperatorName() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable - nothing to clear.
  }
}
