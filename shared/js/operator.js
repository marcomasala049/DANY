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

/**
 * "Marco rossi" / "MARCO ROSSI" / "marco ROSSI" -> "Marco Rossi". Capitalizes
 * the first letter of every word (splitting on spaces, hyphens and
 * apostrophes too, so "jean-pierre d'angelo" -> "Jean-Pierre D'Angelo").
 */
function toTitleCase(name) {
  return name.toLowerCase().replace(/[^\s'-]+/g, word => word.charAt(0).toUpperCase() + word.slice(1));
}

export function getOperatorName() {
  try {
    const name = localStorage.getItem(STORAGE_KEY);
    if (name) return name;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const formatted = toTitleCase(legacy.trim());
      localStorage.setItem(STORAGE_KEY, formatted);
      return formatted;
    }
  } catch {
    // localStorage unavailable (private browsing, quota, ...) - no name.
  }
  return '';
}

/** Stores the trimmed, title-cased name (or clears it if blank) and returns it. */
export function setOperatorName(name) {
  const trimmed = toTitleCase(String(name ?? '').trim());
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

// Common Italian first names ending in "-a" that are nonetheless masculine —
// the exceptions to the "-a -> feminine" heuristic below.
const MASCULINE_A_NAMES = new Set([
  'andrea', 'luca', 'nicola', 'mattia', 'elia', 'enea', 'tobia', 'isaia', 'osea', 'giosia'
]);

/**
 * Best-effort guess at whether a first name is feminine, for the welcome
 * greeting only — there is no reliable way to know for sure (no lookup
 * database here), so this is a simple heuristic for Italian names (most
 * feminine names end in "-a", with a short list of masculine exceptions
 * like Andrea/Luca/Nicola). Good enough for a friendly default; wrong
 * often enough on non-Italian names that it should never gate anything
 * beyond which greeting word is shown.
 */
export function guessIsFeminine(name) {
  const first = String(name ?? '').trim().split(/\s+/)[0] || '';
  const lower = first.toLowerCase();
  if (!lower || MASCULINE_A_NAMES.has(lower)) return false;
  return lower.endsWith('a');
}

/** "Benvenuto" or "Benvenuta" depending on the best-effort gender guess. */
export function welcomeGreeting(name) {
  return guessIsFeminine(name) ? 'Benvenuta' : 'Benvenuto';
}
