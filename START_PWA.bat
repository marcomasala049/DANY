@echo off
setlocal EnableExtensions EnableDelayedExpansion
title DANI - Server PWA locale

rem ================================================================
rem  DANI - avvio locale della PWA per test su Windows.
rem  SOLO per lo sviluppatore: la versione pubblicata (es. GitHub
rem  Pages) non richiede Node.js, ne' alcun server, per gli utenti
rem  finali. Questo script serve solo a testare la PWA in locale.
rem
rem  Doppio clic: avvia server\static-dev-server.mjs (Node.js, nessuna
rem  dipendenza esterna) sulla porta 8000 (o la prima libera) e apre il
rem  browser sulla pagina giusta. Chiudere questa finestra ferma il
rem  server.
rem ================================================================

cd /d "%~dp0"

rem ----------------------------------------------------------------
rem 1. Verifica che Node.js sia disponibile.
rem ----------------------------------------------------------------
set "NODE_OK="
for /f "delims=" %%V in ('node --version 2^>^&1') do (
    echo %%V | findstr /B /R /C:"v[0-9]" >nul && set "NODE_OK=1"
)

if not defined NODE_OK (
    echo.
    echo [ATTENZIONE] Node.js non e' stato trovato su questo PC.
    echo.
    echo     START_PWA.bat usa un piccolo server statico Node.js
    echo     ^(server\static-dev-server.mjs, nessuna dipendenza esterna^)
    echo     solo per testare la PWA in locale durante lo sviluppo.
    echo     Serve quindi Node.js installato e disponibile nel PATH
    echo     ^(https://nodejs.org - installer LTS^).
    echo.
    echo     Nota: questo NON serve per usare l'app pubblicata online.
    echo     La versione pubblicata funziona direttamente dal browser,
    echo     senza Node.js, Python o alcun altro programma.
    echo.
    echo     Nessuna modifica e' stata apportata al sistema.
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%V in ('node --version') do echo [i] Node.js trovato: %%V

rem ----------------------------------------------------------------
rem 2. Trova la prima porta libera a partire da 8000.
rem ----------------------------------------------------------------
set "PORT="
for /f "delims=" %%P in ('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p=8000; while($p -le 8100){try{$l=New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback,$p); $l.Start(); $l.Stop(); break}catch{$p++}}; Write-Output $p"') do set "PORT=%%P"

if not defined PORT set "PORT=8000"

echo [i] Porta scelta: %PORT%
if not "%PORT%"=="8000" echo [i] La porta 8000 era occupata: uso la %PORT% al suo posto.

rem ----------------------------------------------------------------
rem 3. Apri il browser SOLO quando il server risponde davvero
rem    (evita di aprire una pagina non ancora raggiungibile).
rem ----------------------------------------------------------------
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command ^
  "$url='http://localhost:%PORT%/'; for($i=0;$i -lt 40;$i++){try{Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process $url; exit}catch{Start-Sleep -Milliseconds 500}}; Start-Process $url"

rem ----------------------------------------------------------------
rem 4. Avvia il server in QUESTA finestra: resta aperta e mostra i log
rem    finche' non la chiudi (Ctrl+C oppure chiudendo la finestra).
rem ----------------------------------------------------------------
echo.
echo [i] Avvio server su http://localhost:%PORT%/  (apps/editor/index.html)
echo [i] Chiudi questa finestra per fermare il server.
echo.
node "server\static-dev-server.mjs" %PORT%

echo.
echo [i] Server arrestato.
pause
