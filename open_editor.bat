@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ================================================================
rem  Terminal Workspace - launcher
rem  Apre apps\editor\index.html associato al file .txt passato come
rem  argomento. Avvia il server locale (server\local-file-server.ps1)
rem  usato SOLO da /load e /save, sulla porta 8080.
rem ================================================================

set "TXT_FILE=%~1"
if "%TXT_FILE%"=="" (
    echo.
    echo [!] Nessun file .txt passato al tool.
    echo     Usa il BAT con "Apri con..." oppure trascina un .txt sul BAT.
    echo.
    pause
    exit /b 1
)

set "BAT_DIR=%~dp0"
set "HTML_UI=%BAT_DIR%apps\editor\index.html"
set "SERVER_SCRIPT=%BAT_DIR%server\local-file-server.ps1"

if not exist "%HTML_UI%" (
    echo.
    echo [!] ERRORE: apps\editor\index.html non trovato.
    echo     Percorso atteso:
    echo     %HTML_UI%
    echo.
    pause
    exit /b 2
)

if not exist "%SERVER_SCRIPT%" (
    echo.
    echo [!] ERRORE: server\local-file-server.ps1 non trovato.
    echo     Percorso atteso:
    echo     %SERVER_SCRIPT%
    echo.
    pause
    exit /b 3
)

rem ----------------------------------------------------------------
rem 1. Prepara il percorso URL-encoded da passare nell'hash di Edge.
rem    In questo modo spazi, #, %, parentesi, ecc. non rompono l'URL.
rem ----------------------------------------------------------------
for /f "delims=" %%A in ('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[System.Uri]::EscapeDataString($env:TXT_FILE)"') do set "ENCODED_PATH=%%A"

if not defined ENCODED_PATH (
    echo.
    echo [!] Impossibile codificare il percorso del file.
    echo     File: %TXT_FILE%
    echo.
    pause
    exit /b 4
)

rem ----------------------------------------------------------------
rem 2. Avvia il server locale (script esterno, non piu' inline).
rem    NON vengono terminati tutti i processi PowerShell dell'utente.
rem    Il server gestisce esclusivamente GET /load e POST /save.
rem ----------------------------------------------------------------
start "TerminalWorkspaceServer" /b powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%SERVER_SCRIPT%"

rem ----------------------------------------------------------------
rem 3. Piccola attesa per dare tempo al listener di mettersi in ascolto.
rem ----------------------------------------------------------------
timeout /t 1 /nobreak >nul

rem ----------------------------------------------------------------
rem 4. Avvia Edge in modalita App.
rem ----------------------------------------------------------------
set "HTML_URL=file:///%HTML_UI:\=/%"
start "" msedge --app="%HTML_URL%#%ENCODED_PATH%" --window-size=1280,800

exit /b 0
