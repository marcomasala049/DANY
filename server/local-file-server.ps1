<#
.SYNOPSIS
  Minimal local HTTP server used by the Terminal Workspace editor to load
  and save .txt files from the browser (the File System Access API alone
  cannot open an arbitrary path passed on the command line).

.DESCRIPTION
  Serves exactly three endpoints on 127.0.0.1, all read from/write to the
  local filesystem:
    GET  /        health check ("... ONLINE")
    GET  /load    reads the file named by the X-File-Path header
    POST /save    writes the request body to the file named by X-File-Path
  A relative X-File-Path is resolved against the current user's Desktop.

  This script only binds 127.0.0.1 (loopback), so it is not reachable from
  the network. It is meant to be started by launch_editor.bat and stopped
  by closing its (hidden) PowerShell process.

.PARAMETER Port
  TCP port to listen on. Defaults to 8080, matching the editor's frontend.
#>
param(
  [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'

function Write-TextResponse {
  param($Response, [int]$StatusCode, [string]$Text)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = 'text/plain; charset=utf-8'
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.Close()
}

function Resolve-TargetPath {
  param([string]$RawPath)
  $decoded = [System.Net.WebUtility]::UrlDecode($RawPath)
  if ([System.IO.Path]::IsPathRooted($decoded)) {
    return $decoded
  }
  return Join-Path ([Environment]::GetFolderPath('Desktop')) $decoded
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
  $listener.Start()
} catch {
  Write-Error "Impossibile avviare il server sulla porta $Port (magari e' gia' in uso): $($_.Exception.Message)"
  exit 10
}

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $response.Headers['Access-Control-Allow-Origin'] = '*'
    $response.Headers['Access-Control-Allow-Headers'] = 'X-File-Path, Content-Type'
    $response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    $response.Headers['Cache-Control'] = 'no-store'

    if ($request.HttpMethod -eq 'OPTIONS') {
      $response.StatusCode = 204
      $response.Close()
      continue
    }

    $pathHeader = $request.Headers['X-File-Path']

    if ($request.Url.AbsolutePath -eq '/') {
      Write-TextResponse $response 200 'Terminal Workspace local server ONLINE'
      continue
    }

    if ([string]::IsNullOrWhiteSpace($pathHeader)) {
      Write-TextResponse $response 400 'Missing X-File-Path'
      continue
    }

    $target = Resolve-TargetPath $pathHeader

    if ($request.Url.AbsolutePath -eq '/load') {
      if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
        Write-TextResponse $response 404 "File not found: $target"
        continue
      }
      $content = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
      Write-TextResponse $response 200 $content
    }
    elseif ($request.Url.AbsolutePath -eq '/save' -and $request.HttpMethod -eq 'POST') {
      $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
      $body = $reader.ReadToEnd()
      $reader.Close()
      [System.IO.File]::WriteAllText($target, $body, [System.Text.Encoding]::UTF8)
      Write-TextResponse $response 200 'OK'
    }
    else {
      Write-TextResponse $response 404 'Endpoint not found'
    }
  } catch {
    try { Write-TextResponse $response 500 $_.Exception.Message } catch {}
  }
}
