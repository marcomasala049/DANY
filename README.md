# DANI — Data Analysis & Navigation Interface

An offline toolkit for engineering/electrical test technicians. Two
independent, no-build-step web apps plus a small local file server:

- **[apps/editor](apps/editor/index.html)** — "Terminal Workspace": a plain-text
  editor (for test notes/logs) surrounded by widgets a technician needs on
  the bench — clock, unit converter, scientific + quick calculators, motor /
  gearbox / voltage-drop / electrical / thermal formulas, a scientific
  formula library, a TODO list, pinned values, a test-session logger, a
  threshold monitor, a lightweight test-procedure checklist and a mini CSV
  data inspector (stats + chart).
- **[apps/procedure-runner](apps/procedure-runner/index.html)** — "Test
  Procedure Runner": loads a structured test procedure from CSV or XLSX,
  walks an operator through it step by step (sign-off, skip with a reason,
  ±5% tolerance anomaly detection, text-correction proposals, reference
  images), and exports the completed run back to CSV, XLSX or a text report.
- **[server/local-file-server.ps1](server/local-file-server.ps1)** — a
  minimal loopback-only HTTP server (started by
  [open_editor.bat](open_editor.bat)) that lets the editor `GET /load` and
  `POST /save` an arbitrary `.txt` file on disk, since a page opened from
  `file://` can't do that on its own.

## Running it

Both apps are static HTML — open `apps/editor/index.html` or
`apps/procedure-runner/index.html` directly in a browser, no server or
build step required.

To use the editor the way it's meant to be used on Windows (opened on a
specific `.txt` file, with load/save wired up), drag a `.txt` file onto
[open_editor.bat](open_editor.bat), or set it as the default/"Apri con..."
handler for `.txt` files. It starts the local file server on
`127.0.0.1:8080` and opens the editor in an Edge app window.

## Project layout

```
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
shared/js/              helpers used by both apps (escapeHtml, $ helper)
server/                 the local file server the editor's launcher starts
tests/                  node:test suites for every logic/ module
open_editor.bat         Windows launcher (drag a .txt file onto it)
```

Each app keeps its original single-page markup and inline event handlers —
this was a reorganization, not a rewrite — but every piece of behavior now
lives in its own small module: pure calculations and parsers under
`logic/` (no DOM, fully unit-testable), DOM rendering and event handling
under `ui/`, one file per widget/screen.

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
