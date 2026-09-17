import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, stepToRow, buildExportRows, buildTxtReport, EXPORT_COLUMNS } from '../apps/pin-check/js/logic/report.js';

const connector = {
  name: 'D-Sub 9 (DB9) — Maschio',
  pins: [
    { number: 1, signal: 'DCD', function: 'Data Carrier Detect' },
    { number: 5, signal: 'GND', function: 'Signal Ground' }
  ]
};

test('summarize counts pass/fail/pending', () => {
  const steps = [{ result: 'pass' }, { result: 'pass' }, { result: 'fail' }, { result: null }];
  assert.deepEqual(summarize(steps), { pass: 2, fail: 1, pending: 1 });
});

test('stepToRow includes both pins\' signal/function and matches EXPORT_COLUMNS length', () => {
  const step = {
    pinA: 1, pinB: 5, measureTypeId: 'resistance', measuredValue: '12.3', measuredAt: '17/09/2026 10:00:00',
    expectedValue: '12', tolerance: '5%', result: 'pass', notes: 'ok'
  };
  const row = stepToRow(connector, step, 1);
  assert.equal(row.length, EXPORT_COLUMNS.length);
  assert.equal(row[0], connector.name);
  assert.equal(row[2], 1);
  assert.equal(row[3], 1);
  assert.equal(row[4], 5);
  assert.match(row[5], /DCD/);
  assert.match(row[6], /GND/);
  assert.equal(row[7], 'Resistance');
  assert.equal(row[8], '12.3');
  assert.equal(row[9], 'Ω');
  assert.equal(row[12], 'PASS');
});

test('stepToRow leaves Esito blank when result is not yet computed', () => {
  const row = stepToRow(connector, { pinA: 1, pinB: 5, measureTypeId: 'voltage', result: null }, 1);
  assert.equal(row[12], '');
});

test('buildExportRows returns a header row followed by one row per step', () => {
  const rows = buildExportRows(connector, [
    { pinA: 1, pinB: 5, measureTypeId: 'resistance', result: 'pass' },
    { pinA: 1, pinB: 5, measureTypeId: 'continuity', result: 'fail' }
  ]);
  assert.deepEqual(rows[0], EXPORT_COLUMNS);
  assert.equal(rows.length, 3);
  assert.equal(rows[1][2], 1);
  assert.equal(rows[2][2], 2);
});

test('buildTxtReport includes the connector name, counts and each step', () => {
  const steps = [
    { pinA: 1, pinB: 5, measureTypeId: 'resistance', measuredValue: '12.3', expectedValue: '12', tolerance: '5%', result: 'pass' },
    { pinA: 1, pinB: 5, measureTypeId: 'continuity', measuredValue: 'OK (continuità)', result: null }
  ];
  const text = buildTxtReport(connector, steps, { generatedAt: '17/09/2026 10:00:00' });
  assert.match(text, /D-Sub 9 \(DB9\)/);
  assert.match(text, /PASS: 1/);
  assert.match(text, /FAIL: 0/);
  assert.match(text, /Pin 1 . Pin 5/);
});

test('buildTxtReport handles an empty step list without throwing', () => {
  const text = buildTxtReport(connector, [], { generatedAt: '17/09/2026 10:00:00' });
  assert.match(text, /Nessuna misura registrata/);
});
