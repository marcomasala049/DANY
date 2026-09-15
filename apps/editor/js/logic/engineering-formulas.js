/**
 * Pure calculators behind the "Engineering Tools" widget (Motor, Gearbox,
 * V-Drop, Electrical, Thermal). Each function takes plain numbers, returns
 * the computed results plus any physical-range warnings, and touches
 * nothing in the DOM — that makes them trivial to unit test and to reuse.
 */

/** P = T * ω, ω = 2πn/60. Electrical input estimated from mechanical output / efficiency. */
export function calcMotor({ torque, speedRpm, efficiencyPercent }) {
  const omega = 2 * Math.PI * speedRpm / 60;
  const mechanicalPower = torque * omega;
  const efficiency = efficiencyPercent / 100;

  const warnings = [];
  if (efficiencyPercent <= 0 || efficiencyPercent > 100) {
    warnings.push('Efficienza fuori range fisico (0–100%)');
  }
  if (torque < 0 || speedRpm < 0) {
    warnings.push('Coppia o velocità negative: verifica i segni');
  }

  return {
    warnings,
    results: [
      { label: 'ω rad/s', value: omega },
      { label: 'Mechanical power W', value: mechanicalPower },
      { label: 'Electrical estimate W', value: mechanicalPower / efficiency }
    ]
  };
}

/** Output torque/speed of a reduction gearbox, plus input mechanical power. */
export function calcGearbox({ motorTorque, motorSpeedRpm, ratio, efficiencyPercent }) {
  const efficiency = efficiencyPercent / 100;

  const warnings = [];
  if (efficiencyPercent <= 0 || efficiencyPercent > 100) {
    warnings.push('Efficienza fuori range fisico (0–100%)');
  }
  if (ratio <= 0) {
    warnings.push('Il rapporto di riduzione deve essere > 0');
  }

  return {
    warnings,
    results: [
      { label: 'Output torque Nm', value: motorTorque * ratio * efficiency },
      { label: 'Output speed RPM', value: motorSpeedRpm / ratio },
      { label: 'Input mechanical power W', value: motorTorque * motorSpeedRpm * 2 * Math.PI / 60 }
    ]
  };
}

/** Resistive voltage drop: ΔV = I·R, Ploss = I²·R. */
export function calcVoltageDrop({ sourceVoltage, current, cableResistance }) {
  const drop = current * cableResistance;

  const warnings = [];
  if (current < 0 || cableResistance < 0) {
    warnings.push('Corrente o resistenza negative: verifica i segni');
  }
  if (drop > sourceVoltage) {
    warnings.push('La caduta di tensione supera la tensione di sorgente');
  }

  return {
    warnings,
    results: [
      { label: 'Voltage drop V', value: drop },
      { label: 'Load voltage V', value: sourceVoltage - drop },
      { label: 'Cable loss W', value: current * current * cableResistance }
    ]
  };
}

/** DC electrical power split into output and loss via efficiency. */
export function calcElectrical({ voltage, current, efficiencyPercent }) {
  const power = voltage * current;
  const efficiency = efficiencyPercent / 100;

  const warnings = [];
  if (efficiencyPercent <= 0 || efficiencyPercent > 100) {
    warnings.push('Efficienza fuori range fisico (0–100%)');
  }

  return {
    warnings,
    results: [
      { label: 'Input power W', value: power },
      { label: 'Output power W', value: power * efficiency },
      { label: 'Loss W', value: power * (1 - efficiency) }
    ]
  };
}

/** ΔT = P·Rθ. */
export function calcThermal({ ambientTemp, powerLoss, thermalResistance }) {
  const delta = powerLoss * thermalResistance;

  const warnings = [];
  if (powerLoss < 0 || thermalResistance < 0) {
    warnings.push('Potenza o resistenza termica negative: verifica i segni');
  }

  return {
    warnings,
    results: [
      { label: 'ΔT °C', value: delta },
      { label: 'Estimated temperature °C', value: ambientTemp + delta }
    ]
  };
}
