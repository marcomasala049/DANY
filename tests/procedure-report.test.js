import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEndScreenReport, buildFullReportText } from '../apps/procedure-runner/js/logic/report.js';

test('buildEndScreenReport celebrates a clean run with no skips or corrections', () => {
  const report = buildEndScreenReport({ skippedList: [], modifiedList: [] });
  assert.match(report, /Eccellente/);
});

test('buildEndScreenReport lists skipped and modified steps when present', () => {
  const report = buildEndScreenReport({
    skippedList: ['• Passo 2 ⏭ Motivazione: strumento non disponibile'],
    modifiedList: ['• Passo 3 📝 Testo modificato proposto']
  });
  assert.match(report, /Dettaglio Step Saltati/);
  assert.match(report, /Passo 2/);
  assert.match(report, /Segnalazioni \/ Modifiche Testuali pendenti/);
  assert.match(report, /Passo 3/);
  assert.doesNotMatch(report, /Eccellente/);
});

const steps = [
  { step: '1', desc: 'Verifica tensione', expected: '120', measured: '119', notes: '', signature: 'm.rossi', timestamp: 'ts1', correction: '', anomaly: '', skipReason: '' },
  { step: '2', desc: 'Misura corrente', expected: '8.5', measured: '', notes: '', signature: '', timestamp: '', correction: '', anomaly: '', skipReason: '[ts] SALTATO: strumento non disponibile' },
  { step: '3', desc: 'Controllo visivo', expected: 'Conforme', measured: '', notes: 'nota extra', signature: '', timestamp: '', correction: 'testo proposto', anomaly: '', skipReason: '' }
];

test('buildFullReportText includes the header metadata', () => {
  const text = buildFullReportText(steps, { username: 'm.rossi', sourceName: 'procedura.csv', generatedAt: '15/09/2026 10:00:00' });
  assert.match(text, /Data Export:\s+15\/09\/2026 10:00:00/);
  assert.match(text, /Operatore Responsabile: m\.rossi/);
  assert.match(text, /File Sorgente:\s+procedura\.csv/);
});

test('buildFullReportText computes the executive-summary counts', () => {
  const text = buildFullReportText(steps, { username: 'op', sourceName: 'f.csv', generatedAt: 'now' });
  assert.match(text, /Passi Totali Eseguiti e Firmati: 1/);
  assert.match(text, /Passi Totali Saltati \(Skipped\):\s+1/);
  assert.match(text, /Passi con Richieste di Modifica: 1/);
});

test('buildFullReportText labels each step with its actual status', () => {
  const text = buildFullReportText(steps, { username: 'op', sourceName: 'f.csv', generatedAt: 'now' });
  assert.match(text, /STEP N° 1 \[FIRMATO DA: m\.rossi\]/);
  assert.match(text, /STEP N° 2 \[SALTATO \(SKIPPED\)\]/);
  assert.match(text, /STEP N° 3 \[MODIFICATO \/ IN ATTESA DI VERIFICA\]/);
});

test('buildFullReportText falls back to em-dashes when username/sourceName are missing', () => {
  const text = buildFullReportText([], { username: '', sourceName: '', generatedAt: 'now' });
  assert.match(text, /Operatore Responsabile: —/);
  assert.match(text, /File Sorgente:\s+—/);
});

test('buildFullReportText notes when nothing was skipped or modified', () => {
  const clean = [{ step: '1', desc: 'ok', signature: 'op' }];
  const text = buildFullReportText(clean, { username: 'op', sourceName: 'f.csv', generatedAt: 'now' });
  assert.match(text, /Nessun passo è stato saltato/);
  assert.match(text, /Nessuna proposta di modifica/);
});

test('buildFullReportText adds a RIPOSIZIONAMENTO block for a repositioned step', () => {
  const repositioned = [{
    step: '2', desc: 'Misura corrente', skipReason: '[ts] SALTATO: motivo (In realtà da eseguire prima dello STEP 5)',
    repositionedTo: '5', repositionedAt: '2026-01-01 10:00'
  }];
  const text = buildFullReportText(repositioned, { username: 'op', sourceName: 'f.csv', generatedAt: 'now' });
  assert.match(text, />> RIPOSIZIONAMENTO:\s+Eseguito in anticipo prima dello STEP N° 5 \(assegnato il 2026-01-01 10:00\)/);
});

test('buildFullReportText omits the RIPOSIZIONAMENTO block for an ordinary step', () => {
  const text = buildFullReportText(steps, { username: 'op', sourceName: 'f.csv', generatedAt: 'now' });
  assert.doesNotMatch(text, />> RIPOSIZIONAMENTO/);
});
