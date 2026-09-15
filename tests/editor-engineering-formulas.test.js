import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcMotor, calcGearbox, calcVoltageDrop, calcElectrical, calcThermal
} from '../apps/editor/js/logic/engineering-formulas.js';

function valueOf(results, label) {
  const entry = results.find(r => r.label === label);
  assert.ok(entry, `expected a result labeled "${label}"`);
  return entry.value;
}

test('calcMotor: P = T*omega, omega = 2*pi*n/60', () => {
  const { warnings, results } = calcMotor({ torque: 13.85, speedRpm: 1920, efficiencyPercent: 90 });
  assert.equal(warnings.length, 0);
  assert.ok(Math.abs(valueOf(results, 'ω rad/s') - 201.0619298) < 1e-6);
  assert.ok(Math.abs(valueOf(results, 'Mechanical power W') - 2784.707728) < 1e-5);
  assert.ok(Math.abs(valueOf(results, 'Electrical estimate W') - 3094.119698) < 1e-5);
});

test('calcMotor: warns on out-of-range efficiency and negative inputs', () => {
  assert.equal(calcMotor({ torque: 1, speedRpm: 1, efficiencyPercent: 0 }).warnings.length, 1);
  assert.equal(calcMotor({ torque: 1, speedRpm: 1, efficiencyPercent: 150 }).warnings.length, 1);
  assert.equal(calcMotor({ torque: -1, speedRpm: 1, efficiencyPercent: 90 }).warnings.length, 1);
});

test('calcGearbox: output torque/speed and input mechanical power', () => {
  const { warnings, results } = calcGearbox({ motorTorque: 15, motorSpeedRpm: 3840, ratio: 160, efficiencyPercent: 85 });
  assert.equal(warnings.length, 0);
  assert.equal(valueOf(results, 'Output torque Nm'), 2040);
  assert.equal(valueOf(results, 'Output speed RPM'), 24);
  assert.ok(Math.abs(valueOf(results, 'Input mechanical power W') - 6031.857895) < 1e-5);
});

test('calcGearbox: warns when ratio is not > 0', () => {
  const { warnings } = calcGearbox({ motorTorque: 1, motorSpeedRpm: 1, ratio: 0, efficiencyPercent: 90 });
  assert.equal(warnings.length, 1);
});

test('calcVoltageDrop: drop, load voltage and cable loss', () => {
  const { warnings, results } = calcVoltageDrop({ sourceVoltage: 120, current: 8.5, cableResistance: 0.12 });
  assert.equal(warnings.length, 0);
  assert.ok(Math.abs(valueOf(results, 'Voltage drop V') - 1.02) < 1e-9);
  assert.ok(Math.abs(valueOf(results, 'Load voltage V') - 118.98) < 1e-9);
  assert.ok(Math.abs(valueOf(results, 'Cable loss W') - 8.67) < 1e-9);
});

test('calcVoltageDrop: warns when the drop exceeds the source voltage', () => {
  const { warnings } = calcVoltageDrop({ sourceVoltage: 1, current: 10, cableResistance: 5 });
  assert.equal(warnings.length, 1);
});

test('calcElectrical: input/output power and loss', () => {
  const { warnings, results } = calcElectrical({ voltage: 120, current: 8.5, efficiencyPercent: 90 });
  assert.equal(warnings.length, 0);
  assert.equal(valueOf(results, 'Input power W'), 1020);
  assert.ok(Math.abs(valueOf(results, 'Output power W') - 918) < 1e-9);
  assert.ok(Math.abs(valueOf(results, 'Loss W') - 102) < 1e-9);
});

test('calcThermal: delta T and estimated temperature', () => {
  const { warnings, results } = calcThermal({ ambientTemp: 20, powerLoss: 35, thermalResistance: 2.4 });
  assert.equal(warnings.length, 0);
  assert.equal(valueOf(results, 'ΔT °C'), 84);
  assert.equal(valueOf(results, 'Estimated temperature °C'), 104);
});

test('calcThermal: warns on negative power loss or thermal resistance', () => {
  assert.equal(calcThermal({ ambientTemp: 20, powerLoss: -1, thermalResistance: 1 }).warnings.length, 1);
  assert.equal(calcThermal({ ambientTemp: 20, powerLoss: 1, thermalResistance: -1 }).warnings.length, 1);
});
