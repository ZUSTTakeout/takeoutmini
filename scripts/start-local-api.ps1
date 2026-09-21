$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $workspace 'apps/api'
if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
  $response = Invoke-WebRequest 'http://127.0.0.1:3000/api/shops' -UseBasicParsing
  if ($response.StatusCode -eq 200) { Write-Output 'API already running on http://127.0.0.1:3000'; exit 0 }
  throw 'Port 3000 is occupied by a service that did not pass the API check.'
}
$env:DATABASE_URL = 'mysql://campus:local_dev_change_me@127.0.0.1:13306/campus_food'
$env:DEV_AUTH_ENABLED = 'true'
$env:JWT_SECRET = 'local-development-secret-change-me'
$env:NODE_ENV = 'development'
$env:PORT = '3000'
Push-Location $apiDir
try {
  npx prisma db push --skip-generate
  if ($LASTEXITCODE -ne 0) { throw 'Prisma db push failed' }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'API build failed' }
  Start-Process -FilePath (Get-Command node).Source -ArgumentList (Join-Path $apiDir 'dist/main.js') -WorkingDirectory $apiDir -WindowStyle Hidden
  Write-Output 'API started on http://127.0.0.1:3000'
} finally { Pop-Location }
