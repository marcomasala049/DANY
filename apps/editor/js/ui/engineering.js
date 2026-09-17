import { $ } from '../core/dom-helpers.js';
import { daniIcon } from '../../../../shared/js/dani-icons.js';
import {
  calcMotor as computeMotor,
  calcGearbox as computeGearbox,
  calcVoltageDrop as computeVoltageDrop,
  calcElectrical as computeElectrical,
  calcThermal as computeThermal
} from '../logic/engineering-formulas.js';

function fmt(value, unitLabel) {
  return '<div class="result-line"><span>' + unitLabel + '</span><span>' + Number(value.toFixed(6)) + '</span></div>';
}

function renderWarnings(warnings) {
  return warnings.map(msg => '<div class="calc-warn">' + daniIcon('warning', { size: 13 }) + '<span>' + msg + '</span></div>').join('');
}

function renderResultBox(targetId, { warnings, results }) {
  const html = renderWarnings(warnings) + results.map(r => fmt(r.value, r.label)).join('');
  $(targetId).innerHTML = html;
}

/** Switches the active Engineering Tools tab/panel. */
export function showEng(panelId, buttonEl) {
  document.querySelectorAll('.eng-panel').forEach(p => p.classList.remove('active'));
  $('eng-' + panelId).classList.add('active');
  document.querySelectorAll('.eng-tab').forEach(t => t.classList.remove('active'));
  buttonEl.classList.add('active');
}

export function calcMotorUI() {
  renderResultBox('mResult', computeMotor({
    torque: +$('mTorque').value,
    speedRpm: +$('mSpeed').value,
    efficiencyPercent: +$('mEff').value
  }));
}

export function calcGearboxUI() {
  renderResultBox('gResult', computeGearbox({
    motorTorque: +$('gTorque').value,
    motorSpeedRpm: +$('gSpeed').value,
    ratio: +$('gRatio').value,
    efficiencyPercent: +$('gEff').value
  }));
}

export function calcVDropUI() {
  renderResultBox('vResult', computeVoltageDrop({
    sourceVoltage: +$('vSource').value,
    current: +$('vCurrent').value,
    cableResistance: +$('vR').value
  }));
}

export function calcElectricalUI() {
  renderResultBox('eResult', computeElectrical({
    voltage: +$('eV').value,
    current: +$('eI').value,
    efficiencyPercent: +$('eEff').value
  }));
}

export function calcThermalUI() {
  renderResultBox('tResult', computeThermal({
    ambientTemp: +$('tAmb').value,
    powerLoss: +$('tP').value,
    thermalResistance: +$('tR').value
  }));
}
