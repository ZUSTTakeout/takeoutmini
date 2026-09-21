$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'start-local-mysql.ps1')
& (Join-Path $PSScriptRoot 'start-local-api.ps1')
Invoke-RestMethod 'http://localhost:3000/api/shops' | Out-Null
Write-Output 'Local preview backend ready. Recompile in WeChat Devtools.'
