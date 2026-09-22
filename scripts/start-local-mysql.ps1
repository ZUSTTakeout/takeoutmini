$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspace = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'common.ps1')
Import-ProjectEnv -Path (Join-Path $workspace '.env')
Assert-ProjectEnv -Names @(
  'DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME',
  'DATABASE_USER', 'DATABASE_PASSWORD'
)

if ($env:DATABASE_HOST -notin @('127.0.0.1', 'localhost')) {
  throw 'start-local-mysql.ps1 only manages the local Docker database; set DATABASE_HOST to 127.0.0.1 or localhost.'
}
if ($env:DATABASE_PORT -notmatch '^\d+$' -or [int]$env:DATABASE_PORT -lt 1 -or [int]$env:DATABASE_PORT -gt 65535) {
  throw "Invalid database port: $env:DATABASE_PORT"
}
if ($env:DATABASE_NAME -notmatch '^[A-Za-z0-9_]+$') {
  throw 'DATABASE_NAME may contain only letters, numbers, and underscores.'
}
if ($env:DATABASE_USER -eq 'root' -or $env:DATABASE_USER -notmatch '^[A-Za-z0-9_.-]+$') {
  throw 'DATABASE_USER must be a non-root application account using URL-safe characters.'
}
if ($env:DATABASE_PASSWORD -notmatch '^[A-Za-z0-9._~-]+$') {
  throw 'DATABASE_PASSWORD must use URL-safe characters when starting the Compose database.'
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) { throw 'Docker CLI not found. Install Docker Desktop and make sure docker is on PATH.' }

Push-Location $workspace
try {
  Invoke-ProjectCommand -FilePath $docker.Source -ArgumentList @(
    'compose', '--env-file', (Join-Path $workspace '.env'),
    'up', '-d', '--wait', '--wait-timeout', '120', 'mysql'
  )
} finally {
  Pop-Location
}

Write-Output "MySQL is healthy at $($env:DATABASE_HOST):$($env:DATABASE_PORT)."
