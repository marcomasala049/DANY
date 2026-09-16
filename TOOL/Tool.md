# TOOL/

Questa cartella non fa parte dell'app pubblicata: è solo una zona di
scambio dove il mio socio (Mario) lascia nuove versioni/implementazioni dei
tool, senza dover collaborare direttamente su questo repo.

Il flusso è:

1. Mario aggiunge/aggiorna un file qui dentro (es. `analisi_dati.html`).
2. Il contenuto viene letto, confrontato con l'app corrispondente sotto
   `apps/`, e le funzionalità nuove/modificate vengono integrate lì,
   seguendo lo stile e le convenzioni del progetto DANI (variabili CSS/tema
   condivise, manifest, service worker, ecc.).
3. I file dentro `TOOL/` restano solo come sorgente di partenza/riferimento
   — non vengono collegati né serviti dall'app.

La guida completa al confronto TOOL/ → apps/ (mappa, divergenze note,
regole di integrazione) vive in
[CLAUDE_TOOL_INTEGRATION.md](../CLAUDE_TOOL_INTEGRATION.md).

Storico integrazioni:

- `analisi_dati.html` → integrato come nuova app
  [apps/data-analysis](../apps/data-analysis/index.html) ("Data Analysis
  Tool"), collegata dalla Terminal Workspace tramite il pulsante
  "📈 Analisi Dati".
- `editor.html` → integrato dentro
  [apps/editor](../apps/editor/index.html): widget "Editor Stats"
  (righe/parole/caratteri + stato modificato/salvato), widget "Trova &
  Sostituisci" (cerca/sostituisci uno/tutti, Ctrl/Cmd+F), pannello widget
  comprimibile con linguetta laterale (Ctrl/Cmd+B), riordino drag-and-drop
  dei widget con "↺ Reset ordine". Il sistema di tema autonomo del file
  TOOL non è stato copiato — l'app usa `shared/js/theme.js`.
- `procedure_runner.html` → integrato dentro
  [apps/procedure-runner](../apps/procedure-runner/index.html):
  riposizionamento degli step saltati (skip con "recupera prima dello step
  N", banner con gli step collegati sullo step corrente, firma/re-skip
  dal riquadro inline, badge nel sommario, blocco dedicato nel report
  .txt). Le sessioni salvate prima di questa funzione continuano a
  funzionare (i nuovi campi sono semplicemente assenti sugli step vecchi).
- `procedure_builder.html` → integrato nel Builder incorporato
  ([apps/procedure-runner/js/ui/builder.js](../apps/procedure-runner/js/ui/builder.js),
  non una app separata): bozza persistente nel browser, riordino ↑/↓,
  rimozione immagine, import di procedure CSV/XLSX (immagini incluse),
  "Nuova procedura" con conferma, export XLSX autonomo con conferma nome
  file. Riusa il parsing CSV/XLSX e il mapping colonne già presenti nel
  Runner invece di duplicarli.

Scelta non integrata, con motivazione: né `procedure_runner.html` né
`procedure_builder.html` aggiungono colonne CSV/XLSX dedicate al
riposizionamento — il dato sopravvive a un export/reimport solo tramite il
testo del motivo di salto. Non essendoci nel file TOOL stesso, non è stata
aggiunta nemmeno nell'app reale (evita di introdurre uno schema di export
che il TOOL di riferimento non ha).
