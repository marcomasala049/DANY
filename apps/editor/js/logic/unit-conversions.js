/**
 * Technical unit conversions used by the "Convertitore Tecnico" widget.
 * Pure data + pure functions: no DOM access, safe to unit test directly.
 */

/** Maps each conversion key to the key that reverses it (for the swap button). */
export const conversionMap = {
  mm_in: 'in_mm', in_mm: 'mm_in',
  g_oz: 'oz_g', oz_g: 'g_oz',
  kg_lb: 'lb_kg', lb_kg: 'kg_lb',
  n_kgf: 'kgf_n', kgf_n: 'n_kgf',
  nm_inlb: 'inlb_nm', inlb_nm: 'nm_inlb',
  nm_ftlb: 'ftlb_nm', ftlb_nm: 'nm_ftlb',
  rpm_rads: 'rads_rpm', rads_rpm: 'rpm_rads',
  w_kw: 'kw_w', kw_w: 'w_kw',
  wh_kwh: 'kwh_wh', kwh_wh: 'wh_kwh',
  deg_rad: 'rad_deg', rad_deg: 'deg_rad',
  bar_psi: 'psi_bar', psi_bar: 'bar_psi'
};

/** Each entry is [conversionFn, humanReadableLabel]. */
export const conversions = {
  mm_in: [v => v / 25.4, 'mm ➔ in'],
  in_mm: [v => v * 25.4, 'in ➔ mm'],
  g_oz: [v => v / 28.3495, 'g ➔ oz'],
  oz_g: [v => v * 28.3495, 'oz ➔ g'],
  kg_lb: [v => v * 2.20462, 'kg ➔ lb'],
  lb_kg: [v => v / 2.20462, 'lb ➔ kg'],
  n_kgf: [v => v / 9.80665, 'N ➔ kgf'],
  kgf_n: [v => v * 9.80665, 'kgf ➔ N'],
  nm_inlb: [v => v * 8.85075, 'N·m ➔ in·lbf'],
  inlb_nm: [v => v / 8.85075, 'in·lbf ➔ N·m'],
  nm_ftlb: [v => v * .737562, 'N·m ➔ ft·lbf'],
  ftlb_nm: [v => v / .737562, 'ft·lbf ➔ N·m'],
  rpm_rads: [v => v * 2 * Math.PI / 60, 'RPM ➔ rad/s'],
  rads_rpm: [v => v * 60 / (2 * Math.PI), 'rad/s ➔ RPM'],
  w_kw: [v => v / 1000, 'W ➔ kW'],
  kw_w: [v => v * 1000, 'kW ➔ W'],
  wh_kwh: [v => v / 1000, 'Wh ➔ kWh'],
  kwh_wh: [v => v * 1000, 'kWh ➔ Wh'],
  deg_rad: [v => v * Math.PI / 180, 'deg ➔ rad'],
  rad_deg: [v => v * 180 / Math.PI, 'rad ➔ deg'],
  bar_psi: [v => v * 14.5038, 'bar ➔ psi'],
  psi_bar: [v => v / 14.5038, 'psi ➔ bar']
};

/**
 * Converts a value using the given conversion key.
 * @returns {{value:number,label:string}|null} null when the key is unknown or value is NaN.
 */
export function convert(type, value) {
  const entry = conversions[type];
  if (!entry || isNaN(value)) return null;
  const [fn, label] = entry;
  return { value: Number(fn(value).toFixed(6)), label };
}
