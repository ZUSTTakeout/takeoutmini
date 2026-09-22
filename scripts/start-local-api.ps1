$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspace = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $workspace 'apps/api'
$stateDir = Join-Path $workspace '.local/api'
. (Join-Path $PSScriptRoot 'common.ps1')
Import-ProjectEnv -Path (Join-Path $workspace '.env')
Assert-ProjectEnv -Names @(
  'DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME',
  'DATABASE_USER', 'DATABASE_PASSWORD', 'JWT_SECRET'
)

if ($env:NODE_ENV -eq 'production') {
  throw 'start-local-api.ps1 is for development only; NODE_ENV must not be production.'
}
if ($env:DATABASE_NAME -notmatch '^[A-Za-z0-9_]+$') {
  throw 'DATABASE_NAME may contain only letters, numbers, and underscores.'
}
if ($env:DATABASE_PORT -notmatch '^\d+$' -or [int]$env:DATABASE_PORT -lt 1 -or [int]$env:DATABASE_PORT -gt 65535) {
  throw "Invalid database port: $env:DATABASE_PORT"
}
if ($env:JWT_SECRET.Length -lt 32) {
  throw 'JWT_SECRET must contain at least 32 characters.'
}

$env:NODE_ENV = 'development'
if ([string]::IsNullOrWhiteSpace($env:DEV_AUTH_ENABLED)) { $env:DEV_AUTH_ENABLED = 'true' }
if ([string]::IsNullOrWhiteSpace($env:PORT)) { $env:PORT = '3000' }
if ($env:PORT -notmatch '^\d+$' -or [int]$env:PORT -lt 1 -or [int]$env:PORT -gt 65535) {
  throw "Invalid API port: $env:PORT"
}

$encodedUser = [Uri]::EscapeDataString($env:DATABASE_USER)
$encodedPassword = [Uri]::EscapeDataString($env:DATABASE_PASSWORD)
$databaseHost = $env:DATABASE_HOST
if ($databaseHost.Contains(':') -and -not $databaseHost.StartsWith('[')) {
  $databaseHost = "[$databaseHost]"
}
$env:DATABASE_URL = "mysql://${encodedUser}:${encodedPassword}@${databaseHost}:$($env:DATABASE_PORT)/$($env:DATABASE_NAME)"
$readyUrl = "http://127.0.0.1:$($env:PORT)/api/health/ready"

if (Test-ProjectEndpoint -Uri $readyUrl) {
  Write-Output "API already ready at http://127.0.0.1:$($env:PORT)"
  return
}
if (Get-NetTCPConnection -LocalPort ([int]$env:PORT) -State Listen -ErrorAction SilentlyContinue) {
  throw "Port $($env:PORT) is occupied by a service that did not pass the API readiness check."
}

$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
$prisma = Join-Path $apiDir 'node_modules/.bin/prisma.cmd'
if (-not $node -or -not $npm) { throw 'Node.js and npm are required.' }
if (-not (Test-Path -LiteralPath $prisma -PathType Leaf)) {
  throw 'API dependencies are missing. Run npm run setup from the repository root first.'
}

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
Push-Location $apiDir
try {
  Invoke-ProjectCommand -FilePath $prisma -ArgumentList @('db', 'push', '--skip-generate')
  Invoke-ProjectCommand -FilePath $npm.Source -ArgumentList @('run', 'build')
} finally {
  Pop-Location
}

$stdoutLog = Join-Path $stateDir 'stdout.log'
$stderrLog = Join-Path $stateDir 'stderr.log'
$process = Start-Process -FilePath $node.Source -ArgumentList @('dist/main.js') `
  -WorkingDirectory $apiDir -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog
Set-Content -LiteralPath (Join-Path $stateDir 'api.pid') -Value $process.Id

for ($attempt = 1; $attempt -le 45; $attempt++) {
  Start-Sleep -Seconds 1
  $process.Refresh()
  if ($process.HasExited) {
    if (Test-Path -LiteralPath $stderrLog) { Get-Content -LiteralPath $stderrLog -Tail 80 | Write-Output }
    throw "API exited before becoming ready (exit code $($process.ExitCode))."
  }
  if (Test-ProjectEndpoint -Uri $readyUrl) {
    Write-Output "API ready at http://127.0.0.1:$($env:PORT) (PID $($process.Id))."
    return
  }
}

Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $stderrLog) { Get-Content -LiteralPath $stderrLog -Tail 80 | Write-Output }
throw 'API did not become ready within 45 seconds.'
