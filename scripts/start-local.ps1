$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
& (Join-Path $PSScriptRoot 'start-local-mysql.ps1')
& (Join-Path $PSScriptRoot 'start-local-api.ps1')
Write-Output 'Local backend is ready. Build the mini program with npm run build before importing it into WeChat DevTools.'
