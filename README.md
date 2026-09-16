# DANI — Data Analysis & Navigation Interface
https://marcomasala049.github.io/DANY/

An offline-capable, installable PWA toolkit for engineering/electrical test
technicians. Three independent, no-build-step web apps plus a small local
file server:

- **[apps/editor](apps/editor/index.html)** — "Terminal Workspace": a plain-text
  editor (for test notes/logs) surrounded by widgets a technician needs on
  the bench — clock, unit converter, scientific + quick calculators, motor /
  gearbox / voltage-drop / electrical / thermal formulas, a scientific
  formula library, a TODO list, pinned values, a test-session logger, a
  threshold monitor, a lightweight test-procedure checklist, a mini CSV
  data inspector (stats + chart), live editor stats (lines/words/chars +
  modified/saved status), a Find & Replace widget (Ctrl/Cmd+F), a
  collapsible widget panel (Ctrl/Cmd+B) and drag-and-drop widget reordering.
- **[apps/procedure-runner](apps/procedure-runner/index.html)** — "Test
  Procedure Runner": loads a structured test procedure from CSV or XLSX,
  walks an operator through it step by step (sign-off, skip with a reason,
  ±5% tolerance anomaly detection, text-correction proposals, reference
  images), lets a skipped step be repositioned to reappear as a banner
  right before whichever step it needs to run ahead of (sign, re-skip or
  jump to it inline, with a summary badge and a report line once resolved),
  and exports the completed run back to CSV, XLSX or a text report. Its
  built-in Procedure Builder also keeps an autosaved browser-local draft,
  supports reordering/importing/exporting steps (CSV/XLSX, with images) on
  top of defining and starting a procedure directly.
- **[apps/data-analysis](apps/data-analysis/index.html)** — "Data Analysis
  Tool": loads several CSV/TXT/XLSX files at once and plots their channels
  either as a single chart with independent left/right Y axes or as
  stacked multi-panel views, with datetime-aware X axis, pan/zoom (wheel,
  box-zoom, per-panel Y zoom), two draggable/typed cursors, an auto /
  normalized / log10 Y-scale mode, per-interval statistics (mean, RMS, σ,
  min/max, integral) and an FFT spectrum per channel, a report export to
  `.txt`, and a detached popup window for the stats/FFT panel.
- **[server/local-file-server.ps1](server/local-file-server.ps1)** — a
  minimal loopback-only HTTP server (started by
  [open_editor.bat](open_editor.bat)) that lets the editor `GET /load` and
  `POST /save` an arbitrary `.txt` file on disk, since a page opened from
  `file://` can't do that on its own.

## Running it

Open `index.html` (the repo root) — a small home screen with a button for
each of the three apps below. Every app is also plain static HTML on its
own, so `apps/editor/index.html`, `apps/procedure-runner/index.html` and
`apps/data-analysis/index.html` can each be opened directly too; no server
or build step required either way.

To use the editor the way it's meant to be used on Windows (opened on a
specific `.txt` file, with load/save wired up), drag a `.txt` file onto
[open_editor.bat](open_editor.bat), or set it as the default/"Apri con..."
handler for `.txt` files. It starts the local file server on
`127.0.0.1:8080` and opens the editor in an Edge app window.

## Project layout

```
index.html              home screen — buttons to each of the 3 apps below
manifest.webmanifest     Web App Manifest (name, icons, start_url, ...)
service-worker.js        app-shell cache — offline support, installability
icons/                   PWA icons (generated from the app's own ">_" mark)
apps/
  editor/              Terminal Workspace app
    index.html
    css/styles.css
    js/
      main.js          bootstraps the page, wires window.<fn> for the
                        markup's inline onclick/onchange handlers
      core/            tiny DOM helpers local to this app
      logic/           pure functions — no DOM, unit tested
      ui/              DOM rendering + event handling, one file per widget
  procedure-runner/     Test Procedure Runner app
    index.html
    css/styles.css
    js/                same core / logic / ui split as the editor
  data-analysis/       Data Analysis Tool app
    index.html
    css/styles.css
    js/main.js         single module — parsing, plotting, FFT and UI
                        wiring; kept as one file to track the source tool
                        in TOOL/ (see below) with minimal drift
shared/js/              helpers used by all three apps (dom-utils, pwa.js,
                        theme.js)
server/
  local-file-server.ps1     used by open_editor.bat (the editor's own /load /save)
  static-dev-server.mjs     used by START_PWA.bat (local PWA testing only)
tests/                  node:test suites for every logic/ module
open_editor.bat         Windows launcher: opens the editor on one .txt file
START_PWA.bat           Windows launcher: serves the whole app for local
                         PWA/offline testing (dev-only, see below)
```

The editor and procedure-runner keep their original single-page markup and
inline event handlers — this was a reorganization, not a rewrite — but
every piece of behavior now lives in its own small module: pure
calculations and parsers under `logic/` (no DOM, fully unit-testable), DOM
rendering and event handling under `ui/`, one file per widget/screen.
data-analysis is intentionally not split the same way (see below).

## The TOOL/ folder

[TOOL/](TOOL/) is not part of the published app — it's a drop box for a
collaborator to hand over new tool versions outside of git collaboration
on this repo directly. When something new lands there, it gets read,
diffed against the matching app here, and the new/changed behavior gets
folded into the real app under `apps/` (styled with this project's shared
CSS variables/theme, wired into the manifest, service worker and tests
where it makes sense) — TOOL/ itself is never linked from the app or
shipped. `apps/data-analysis` started this way, from `TOOL/analisi_dati.html`;
its `js/main.js` is deliberately kept as one file (not split into
`logic/`/`ui/` like the other two apps) specifically so future drops in
TOOL/ stay easy to diff and re-integrate.

## Tests

Every `logic/` module (unit conversions, the calculator's expression
evaluator, engineering formulas, CSV parsing, column mapping, step/anomaly
rules, report text) is covered by [node:test](https://nodejs.org/api/test.html)
suites in [tests/](tests/) — no test framework or dependency to install,
just Node.js itself (18.17+):

```
npm test
```

`ui/` modules are thin DOM glue over the tested `logic/` functions and are
exercised manually in the browser rather than unit tested (they'd need a
DOM environment like jsdom, which this project intentionally avoids to
stay dependency-free).

## PWA & deployment

The whole project — `index.html`, `manifest.webmanifest`, `service-worker.js`,
`icons/`, `apps/`, `shared/` — is a static site with no build step and no
runtime dependency on anything (no Python, no Node.js, no backend). Publish
the **repository root** as-is to any static host (GitHub Pages, Cloudflare
Pages, Netlify, a plain HTTPS server); nothing needs to be built, bundled or
copied into a separate `dist/` folder first.

Every PWA-related path (the manifest link, icons, the service worker
registration, its precache list, and the root redirect) is written
**relative to its own file**, not as `/absolute` paths — so the same files
work identically whether served from a domain root or a subfolder, e.g.
`https://user.github.io/DANY/`.

Once published, opening the URL, using the app, and installing it (browser
menu, or the editor's own "📲 Installa App" button where the browser
supports it) is all that's needed — no server, no CLI, nothing to install
beforehand. The app keeps working fully offline after the first successful
load (all three apps' entire JS/CSS, the manifest and the icons are precached).

**Local-only exception:** the editor's "Salva Modifiche" / "Salva come nuovo
.txt" *without* picking a folder talks to `server/local-file-server.ps1` on
`127.0.0.1:8080` (via [open_editor.bat](open_editor.bat)). That's a
Windows-only, local-machine feature by design — it isn't and can't be part
of a hosted PWA (a web page can't write arbitrary files on its own). When
used as the published PWA, saving a new file works by picking a folder
explicitly ("📁 SELEZIONA CARTELLA", File System Access API — Chrome/Edge
only); without a server or that API, "Salva" will show an error. Every
other feature (calculators, converter, formulas, TODO, session log,
threshold monitor, the CSV data inspector, and the whole Test Procedure
Runner including CSV/XLSX import-export) works fully client-side with no
such limitation.

### Testing the PWA locally on Windows (developer-only)

[START_PWA.bat](START_PWA.bat) serves the project over `http://localhost`
so the service worker and manifest (which need a real http(s) origin —
they don't run from a `file://` page) can be tested before publishing.
Double-click it: it checks for Node.js, starts
[server/static-dev-server.mjs](server/static-dev-server.mjs) (built-in
`node:http`/`node:fs` only, no dependencies) on port 8000 (or the next free
port), waits for it to respond, and opens the browser automatically. Close
its window to stop the server. Node.js is only needed for this local dev
loop — the published site needs none of it.
