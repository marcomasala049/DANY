/**
 * Static content for the Scientific Formula Library / Engineering Formulas
 * panels. Each entry is [category, name, formula]. Plain data, no behavior.
 */
export const scientificFormulas = [
  ['MECHANICAL', 'Torque', 'T = F · r'],
  ['MECHANICAL', 'Mechanical power', 'P = T · ω'],
  ['MECHANICAL', 'Angular speed', 'ω = 2πn / 60'],
  ['MECHANICAL', 'Rotational kinetic energy', 'E = ½ I ω²'],
  ['MECHANICAL', 'Linear power', 'P = F · v'],
  ['MECHANICAL', 'Angular acceleration', 'α = Δω / Δt'],
  ['MECHANICAL', 'Kinetic energy', 'E = ½ m v²'],
  ['MECHANICAL', 'Momentum', 'p = m v'],

  ['MOTOR / DRIVE', 'Motor torque constant', 'Kt = T / I'],
  ['MOTOR / DRIVE', 'Back EMF', 'E = Ke · ω'],
  ['MOTOR / DRIVE', 'Motor copper loss', 'Pcu = I² R'],
  ['MOTOR / DRIVE', 'Motor efficiency', 'η = Pout / Pin'],
  ['MOTOR / DRIVE', 'Electrical input power', 'Pin = V · I'],

  ['GEARBOX', 'Reduction ratio', 'i = nin / nout'],
  ['GEARBOX', 'Output speed', 'nout = nin / i'],
  ['GEARBOX', 'Ideal output torque', 'Tout = Tin · i'],
  ['GEARBOX', 'Real output torque', 'Tout = Tin · i · η'],
  ['GEARBOX', 'Gear power', 'Pout = Pin · η'],

  ['ELECTRICAL', 'Ohm law', 'V = I · R'],
  ['ELECTRICAL', 'Power DC', 'P = V · I = I²R = V²/R'],
  ['ELECTRICAL', 'Energy', 'E = P · t'],
  ['ELECTRICAL', 'Resistive voltage drop', 'ΔV = I · R'],
  ['ELECTRICAL', 'Resistive loss', 'Ploss = I² · R'],
  ['ELECTRICAL', 'Three-phase power', 'P = √3 · VL · IL · PF · η'],
  ['ELECTRICAL', 'Series resistance', 'Rtotal = ΣR'],
  ['ELECTRICAL', 'Parallel resistance', '1/Rtotal = Σ(1/Ri)'],

  ['THERMAL', 'Temperature rise', 'ΔT = P · Rθ'],
  ['THERMAL', 'Thermal resistance', 'Rθ = ΔT / P'],
  ['THERMAL', 'Heat energy', 'Q = m · cp · ΔT'],
  ['THERMAL', 'Conduction', 'Q̇ = k A ΔT / L'],

  ['FLUIDS / PRESSURE', 'Pressure', 'p = F / A'],
  ['FLUIDS / PRESSURE', 'Hydrostatic pressure', 'p = ρ g h'],
  ['FLUIDS / PRESSURE', 'Fluid power', 'P = Δp · Q'],

  ['CONTROL / DYNAMICS', 'Newton 2', 'F = m · a'],
  ['CONTROL / DYNAMICS', 'Spring force', 'F = k · x'],
  ['CONTROL / DYNAMICS', 'Damping force', 'F = c · v'],
  ['CONTROL / DYNAMICS', 'First-order time constant', 'τ = R C'],

  ['GEOMETRY', 'Circle area', 'A = π r²'],
  ['GEOMETRY', 'Circle circumference', 'C = 2πr'],
  ['GEOMETRY', 'Cylinder volume', 'V = π r² h']
];

/** Categories excluded from the compact "Engineering Tools" panel. */
export const ENGINEERING_TAB_EXCLUDED_CATEGORIES = [
  'FLUIDS / PRESSURE', 'CONTROL / DYNAMICS', 'GEOMETRY'
];
