# DANI — guida per integrare gli aggiornamenti da TOOL/

## Obiettivo

La cartella [TOOL/](TOOL/) contiene versioni monolitiche HTML consegnate
come riferimento. Non è codice pubblicato e non deve essere collegata alla
PWA. Il codice reale da modificare vive in [apps/](apps/).

L'integrazione deve essere **semantica, non un copia-incolla**: Editor e
Procedure Runner sono stati suddivisi in moduli, condividono tema/PWA/
utilità e contengono già funzioni che non esistono nei file monolitici.

## Architettura attuale

| Sorgente di confronto | Destinazione reale | Note |
| --- | --- | --- |
| `TOOL/editor.html` | `apps/editor/` | Separare logica pura, UI e bootstrap. Conservare tutti i widget già presenti nell'app. |
| `TOOL/procedure_runner.html` | `apps/procedure-runner/` | Integrare nelle unità `logic/` e `ui/`; non sostituire l'app con il file monolitico. |
| `TOOL/procedure_builder.html` | `apps/procedure-runner/js/ui/builder.js` più markup/CSS/logic necessari | Il Builder reale è incorporato nel Runner. Non creare una quarta app separata salvo richiesta esplicita. |
| `TOOL/analisi_dati.html` | `apps/data-analysis/` | Il JS reale è volutamente quasi monolitico per facilitare questo confronto. Adattare comunque tema e PWA condivisi. |

Flusso della PWA: `index.html` apre le tre app; ogni app registra
`service-worker.js`; il service worker precachea tutti gli asset elencati.
Se si aggiunge o rinomina un file reale, aggiornare `PRECACHE_PATHS` e
incrementare `CACHE_VERSION`.

## Divergenze funzionali individuate

Queste sono differenze osservabili tra i file attualmente presenti.
L'archivio non contiene la cronologia Git precedente, quindi una
differenza non dimostra da sola quale versione sia cronologicamente più
recente. Va trattata come **candidata all'integrazione** e verificata nel
comportamento.

### 1. Editor

Funzioni presenti in `TOOL/editor.html` e assenti dall'app modulare:

- statistiche live dell'editor: righe, parole, caratteri e stato modificato/salvato;
- widget Trova & Sostituisci, con cerca successivo, sostituisci uno e sostituisci tutti;
- scorciatoia Ctrl/Cmd+F collegata alla ricerca interna;
- pannello widget comprimibile tramite linguetta laterale, con stato persistente;
- riordino drag-and-drop dei widget e persistenza dell'ordine;
- reset dell'ordine dei widget;
- alcune differenze nella guida contestuale e nella gestione del tema.

Funzioni presenti solo nell'app reale che **devono restare**:

- PWA/installazione e tema condiviso `dani_theme`;
- salvataggio tramite server locale o File System Access API;
- Session Logger, Threshold Monitor, checklist procedura e CSV Data Inspector;
- calcolatrici modulari/testate, gestione stato workspace e widget visibility;
- adattamento a viewport mobile e tastiera virtuale.

Destinazioni consigliate:

- nuova UI editor/statistiche/ricerca in un modulo dedicato sotto `apps/editor/js/ui/`;
- drag-and-drop, ordine e compressione pannello in `ui/widgets.js` o modulo dedicato;
- funzioni pure eventualmente testabili sotto `logic/`;
- markup in `apps/editor/index.html`, stile in `apps/editor/css/styles.css`, esposizione handler in `js/main.js`.

### 2. Procedure Runner

Funzione principale presente in `TOOL/procedure_runner.html` e assente
dall'app modulare: **riposizionamento degli step saltati**.

Il file TOOL permette di:

- saltare uno step indicando prima di quale step dovrà essere recuperato;
- memorizzare `repositionedTo` e `repositionedAt`;
- mostrare, al momento giusto, gli step saltati collegati allo step corrente;
- firmare lo step recuperato direttamente dal riquadro collegato;
- cambiare successivamente la destinazione con il flusso di re-skip;
- conservare lo storico del riposizionamento nelle note;
- mostrare badge "da eseguire prima di..." / "eseguito prima di..." nel sommario;
- riportare il riposizionamento nel report testuale e nell'export.

Altre differenze TOOL: area operatore/sticky header e gestione tema
locale. **Il tema locale non va copiato**: usare `shared/js/theme.js` e
l'ID standard `themeToggleBtn`.

Funzioni presenti solo nell'app reale che **devono restare**:

- Builder incorporato;
- template CSV/XLSX;
- export aggiornato CSV, XLSX e report TXT;
- suddivisione `logic/`/`ui/`, test automatici, drag-and-drop file già modulare;
- PWA e tema condiviso.

Destinazioni consigliate:

- stato e campi dati in `ui/state.js` e normalizzazione/caricamento in `logic/column-mapping.js`/loader;
- regole pure di stato/riposizionamento in `logic/steps.js` con test;
- interfaccia e azioni in `ui/execution.js`;
- sommario in `ui/summary.js`;
- XLSX/CSV/TXT in `ui/export.js`, `ui/xlsx-io.js` e `logic/report.js`.

La persistenza sessione deve includere i nuovi campi **senza rompere
sessioni vecchie** che non li possiedono.

### 3. Procedure Builder

`TOOL/procedure_builder.html` è più completo del Builder incorporato.
Contiene:

- bozza persistente in `localStorage` (`procbuilder_draft`), ripristino e data salvataggio;
- aggiunta, eliminazione e riordino su/giù degli step;
- immagini con anteprima, sostituzione e rimozione;
- import di procedure CSV e XLSX, incluse immagini incorporate;
- creazione di una nuova procedura con conferma se esiste contenuto;
- validazione e scelta del nome prima dell'export;
- export XLSX completo con immagini e colonne standard.

Il Builder incorporato ha già input descrizione/atteso/immagine e avvio
immediato della procedura, quindi va **esteso senza duplicarlo**.
Conservare l'opzione "avvia subito" e aggiungere le capacità utili del
file TOOL. Riutilizzare parsing, mapping colonne e codice XLSX già
modularizzati invece di duplicarli.

### 4. Data Analysis

Funzioni/comportamenti presenti nel file TOOL da valutare e integrare:

- cursori verticali C1/C2 trascinabili tramite hit-test vicino alla linea;
- stessa variabile proveniente da file diversi assegnata allo stesso pannello in modalità stacked;
- cambio pannello sincronizzato per tutte le righe con lo stesso nome variabile;
- colore/badge stabile determinato dal nome della variabile;
- riassegnazione coerente passando tra grafico singolo e stacked;
- tavolozza e ridisegno aggiornati al cambio tema.

Funzioni presenti solo nell'app reale che **devono restare**:

- tooltip sul grafico;
- chiusura scheda, install prompt, service worker e tema condiviso;
- tutte le funzioni già documentate: CSV/TXT/XLSX, zoom/pan, stacked, scale auto/normalizzata/log, statistiche, integrale, FFT, popup e report.

Non copiare il sistema di tema autonomo del file TOOL. Tradurre i colori
in variabili CSS o leggere il tema condiviso, mantenendo il ridisegno di
grafico/FFT quando il tema cambia.

## Regole di integrazione

- Non modificare i file sorgente in `TOOL/`; servono come riferimento e confronto futuro.
- Non rimpiazzare intere cartelle `apps/...` con gli HTML monolitici.
- Conservare tutte le funzioni app-only elencate sopra.
- Estrarre la logica senza DOM in `logic/` ed esportarla per i test; mantenere in `ui/` solo rendering ed eventi.
- Riutilizzare `shared/js/dom-utils.js`, `shared/js/theme.js` e `shared/js/pwa.js`.
- Evitare nuove dipendenze e build step. L'app deve restare HTML/CSS/JS statico.
- Gestire dati e sessioni precedenti con campi mancanti.
- Aggiornare `README.md` e `TOOL/Tool.md` con uno storico sintetico di ciò che è stato realmente integrato.
- Se cambiano gli asset precacheati, aggiornare il service worker e incrementare la cache.
- Eseguire `npm test` dopo ogni blocco e alla fine. Aggiungere test per ogni nuova regola pura.

## Ordine consigliato

1. Integrare Editor Stats + Trova/Sostituisci.
2. Integrare ordine widget e pannello comprimibile.
3. Estendere il Builder riusando le utility esistenti.
4. Integrare il riposizionamento degli step nel Runner con test di compatibilità sessioni.
5. Integrare i miglioramenti semantici di Data Analysis conservando tooltip e tema condiviso.
6. Verificare PWA/offline e aggiornare documentazione.

## Verifiche minime

- `npm test` deve restituire zero errori (stato iniziale verificato: 96 test superati).
- Aprire le tre app dalla home senza errori in console.
- Provare tema chiaro/scuro e persistenza su tutte le pagine.
- Editor: salvataggio, ricerca/sostituzione, statistiche, riordino e riapertura.
- Runner: import CSV/XLSX, firma, anomalia ±5%, skip semplice, skip riposizionato, re-skip, ripresa sessione ed export nei tre formati.
- Builder: bozza, riordino, immagini, import, export e avvio diretto.
- Data Analysis: stesso nome canale in due file, cambio single/stacked, drag C1/C2, tooltip, zoom/pan, stats/FFT e popup.
- Offline: ricaricare ogni app dopo il primo caricamento servito via HTTP.

## Prompt pronto per Claude

Analizza l'intero repository DANI prima di modificare codice. Leggi
integralmente:
- `README.md`
- `CLAUDE_TOOL_INTEGRATION.md`
- `TOOL/Tool.md`
- i quattro file `TOOL/*.html`
- le app corrispondenti sotto `apps/`
- `shared/js/*`, `service-worker.js` e `tests/`

Obiettivo: integrare nel codice reale sotto `apps/` gli aggiornamenti
funzionali presenti nei file monolitici di `TOOL/`, senza collegare o
pubblicare `TOOL/` e senza perdere nessuna funzione già presente solo
nell'app modulare.

Non fare un copia-incolla e non sostituire le app modulari con gli HTML
monolitici. Esegui un confronto semantico funzione per funzione, usa la
mappa e le divergenze documentate in `CLAUDE_TOOL_INTEGRATION.md`, quindi
prepara prima una matrice:

1. funzione TOOL;
2. equivalente attuale nell'app;
3. azione: già presente / integrare / adattare / non applicabile;
4. file reali da modificare;
5. test da aggiungere.

Dopo la matrice procedi per blocchi piccoli nell'ordine suggerito dalla
guida. La logica pura va in `logic/` con test `node:test`; rendering ed
eventi in `ui/`. Riusa tema, PWA e helper condivisi. Mantieni
compatibilità con sessioni/localStorage vecchi. Non aggiungere dipendenze
o build step.

Vincoli di preservazione essenziali:

- **Editor**: conserva Session Logger, Threshold Monitor, checklist, CSV Data Inspector, salvataggio locale/File System Access API e installazione PWA.
- **Runner**: conserva Builder incorporato, template, export CSV/XLSX/TXT, immagini, session recovery e anomalia ±5%.
- **Data Analysis**: conserva tooltip, zoom/pan, FFT, popup, report, tutte le scale e il tema condiviso.

Al termine:

- esegui `npm test`;
- fai una verifica manuale delle tre app via server HTTP locale;
- aggiorna `README.md`, `TOOL/Tool.md`, `service-worker.js` e `CACHE_VERSION` solo quando necessario;
- elenca precisamente file modificati, funzioni integrate, test eseguiti ed eventuali differenze TOOL non integrate con motivazione.

Non dichiarare conclusa l'attività se i test falliscono o se una funzione
app-only è stata rimossa.
