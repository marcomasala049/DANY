/**
 * Pure text-report builders. Takes step data + a pre-computed timestamp in,
 * returns the exact string the UI then downloads as a .txt file or shows in
 * the end-of-run screen — no Date.now(), no DOM, deterministic for tests.
 */
import { repositionTargetOf } from './steps.js';

/** Short summary shown in the "Fine Controlli Procedura" screen. */
export function buildEndScreenReport({ skippedList, modifiedList }) {
  let report = 'REGISTRO GENERALE DELLA SESSIONE OPERATIVA\n';
  report += '------------------------------------------------------------------------------\n';

  if (skippedList.length) {
    report += 'Dettaglio Step Saltati con Motivazione:\n' + skippedList.join('\n') + '\n\n';
  }
  if (modifiedList.length) {
    report += 'Segnalazioni / Modifiche Testuali pendenti:\n' + modifiedList.join('\n') + '\n\n';
  }
  if (!skippedList.length && !modifiedList.length) {
    report += '🎉 Eccellente! Tutti i passi della procedura sono stati completati senza anomalie o salti.';
  }

  return report;
}

/** Full, detailed .txt report exported at the end of a run. */
export function buildFullReportText(steps, { username, sourceName, generatedAt }) {
  let countSigned = 0;
  let countSkipped = 0;
  let countModified = 0;
  const skippedList = [];
  const modifiedList = [];

  steps.forEach(s => {
    if (s.skipReason && s.skipReason.trim()) {
      countSkipped++;
      skippedList.push('  • STEP N° ' + s.step + ' -> ' + s.skipReason);
    } else if (s.signature && s.signature.trim()) {
      countSigned++;
    }

    if (s.correction && s.correction.trim()) {
      countModified++;
      modifiedList.push('  • STEP N° ' + s.step + ' -> Proposta: ' + s.correction);
    }
  });

  let out = '';
  out += '=======================================================================\n';
  out += '               REPORT DI FINE PROCEDURA OPERATIVA (AIT)\n';
  out += '=======================================================================\n\n';

  out += 'Data Export:             ' + generatedAt + '\n';
  out += 'Operatore Responsabile: ' + (username || '—') + '\n';
  out += 'File Sorgente:           ' + (sourceName || '—') + '\n\n';

  out += '=======================================================================\n';
  out += '                      EXECUTIVE SUMMARY AVANZAMENTO\n';
  out += '=======================================================================\n';

  out += ' ✔ Passi Totali Eseguiti e Firmati: ' + countSigned + '\n';
  out += ' ⏭ Passi Totali Saltati (Skipped):  ' + countSkipped + '\n';
  out += ' 📝 Passi con Richieste di Modifica: ' + countModified + '\n';

  out += '=======================================================================\n\n';

  out += '>> RECAP ACCURATO DEI PASSI SALTATI (SKIPPED):\n';
  out += skippedList.length
    ? skippedList.join('\n') + '\n'
    : '  Nessun passo è stato saltato durante questa sessione operativa.\n';
  out += '\n';

  out += '>> RECAP DELLE PROPOSTE DI MODIFICA TESTUALE:\n';
  out += modifiedList.length
    ? modifiedList.join('\n') + '\n'
    : '  Nessuna proposta di modifica è stata registrata.\n';
  out += '\n\n';

  out += '=======================================================================\n';
  out += '                    LOG SEQUENZIALE DETTAGLIATO\n';
  out += '=======================================================================\n';

  steps.forEach(s => {
    let statusText;
    if (s.skipReason && s.skipReason.trim()) statusText = 'SALTATO (SKIPPED)';
    else if (s.correction && s.correction.trim()) statusText = 'MODIFICATO / IN ATTESA DI VERIFICA';
    else if (s.signature && s.signature.trim()) statusText = 'FIRMATO DA: ' + s.signature;
    else statusText = 'NON COMPILATO';

    out += '-----------------------------------------------------------------------\n';
    out += '▶ STEP N° ' + s.step + ' [' + statusText + ']\n';
    out += '-----------------------------------------------------------------------\n';

    out += ' >> DESCRIZIONE OPERATIVA:\n    ' + (s.desc || 'Nessuna descrizione') + '\n';
    if (s.expected) out += ' >> ATTESO:\n    ' + s.expected + '\n';
    if (s.measured) out += ' >> MISURATO:\n    ' + s.measured + '\n';
    if (s.notes && s.notes.trim()) out += ' >> NOTE OPERATORE:\n    ' + s.notes.replace(/\n/g, '\n    ') + '\n';

    const repositionTarget = repositionTargetOf(s);
    if (repositionTarget) {
      out += ' >> RIPOSIZIONAMENTO:\n    Eseguito in anticipo prima dello STEP N° ' + repositionTarget;
      if (s.repositionedAt) out += ' (assegnato il ' + s.repositionedAt + ')';
      out += '\n';
    }

    if (s.correction && s.correction.trim()) out += ' >> PROPOSTA MODIFICA TESTO:\n    ' + s.correction + '\n';
    if (s.anomaly && s.anomaly.trim()) out += ' >> ANOMALIA:\n    ' + s.anomaly + '\n';
    if (s.skipReason && s.skipReason.trim()) out += ' >> MOTIVO SALTO:\n    ' + s.skipReason + '\n';

    out += '\n';
  });

  return out;
}
