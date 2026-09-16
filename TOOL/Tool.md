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

Storico integrazioni:

- `analisi_dati.html` → integrato come nuova app
  [apps/data-analysis](../apps/data-analysis/index.html) ("Data Analysis
  Tool"), collegata dalla Terminal Workspace tramite il pulsante
  "📈 Analisi Dati".
