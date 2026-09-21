$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $workspace '.local/mysql'
$aliasDir = 'C:\campus-food-mysql\data'
if (-not (Test-Path -LiteralPath $aliasDir)) {
  New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
  New-Item -ItemType Directory -Force -Path 'C:\campus-food-mysql' | Out-Null
  New-Item -ItemType Junction -Path $aliasDir -Target $dataDir | Out-Null
}
$link = Get-Item -LiteralPath $aliasDir
if ($link.LinkType -ne 'Junction' -or [IO.Path]::GetFullPath(@($link.Target)[0]) -ne [IO.Path]::GetFullPath($dataDir)) {
  throw 'MySQL path alias does not point to this project; refusing to start.'
}
$dataDir = $aliasDir
$mysqld = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
$mysql = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
$port = 13306

if (-not (Test-Path -LiteralPath $mysqld)) { throw "mysqld.exe not found: $mysqld" }
$existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($existing) { Write-Output "MySQL already listening on 127.0.0.1:$port"; exit 0 }
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
$marker = Join-Path $dataDir 'mysql'
if (-not (Test-Path -LiteralPath $marker)) {
  & $mysqld --initialize-insecure --datadir=$dataDir --console
  if ($LASTEXITCODE -ne 0) { throw "MySQL initialization failed ($LASTEXITCODE)" }
}
$logFile = 'C:\campus-food-mysql\mysql.err'
$pidFile = 'C:\campus-food-mysql\mysql.pid'
$args = @("--no-defaults", "--datadir=$dataDir", "--port=$port", "--bind-address=127.0.0.1", "--skip-name-resolve", "--explicit_defaults_for_timestamp", "--mysqlx=OFF", "--log-error=$logFile", "--pid-file=$pidFile", "--console")
Start-Process -FilePath $mysqld -ArgumentList $args -WindowStyle Hidden | Out-Null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { break }
}
if (-not (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) { if (Test-Path $logFile) { Get-Content $logFile -Tail 80 | Write-Output }; throw "MySQL did not listen on port $port" }
$env:MYSQL_PWD = 'local_dev_change_me'
& $mysql --no-defaults --protocol=tcp --host=127.0.0.1 --port=$port --user=campus -e 'SELECT 1;'
Remove-Item Env:MYSQL_PWD
if ($LASTEXITCODE -ne 0) { throw "MySQL project user initialization failed ($LASTEXITCODE)" }
Write-Output "Project MySQL ready at 127.0.0.1:$port (datadir $dataDir)"
