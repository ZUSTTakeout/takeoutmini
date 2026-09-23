Set-StrictMode -Version Latest

function Import-ProjectEnv {
  param([Parameter(Mandatory)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Environment file not found: $Path. Copy .env.example to .env first."
  }

  foreach ($rawLine in [IO.File]::ReadAllLines($Path)) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith('#')) { continue }

    $separator = $line.IndexOf('=')
    if ($separator -lt 1) { throw "Invalid .env line: $rawLine" }
    $name = $line.Substring(0, $separator).Trim()
    if ($name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
      throw "Invalid environment variable name: $name"
    }

    $value = $line.Substring($separator + 1).Trim()
    if ($value.Length -ge 2) {
      $first = $value[0]
      $last = $value[$value.Length - 1]
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }

    if ($null -eq [Environment]::GetEnvironmentVariable($name, 'Process')) {
      [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
  }

  # Keep older local .env files usable while the checked-in example uses the
  # DATABASE_* names. Compose supports the same fallback values.
  $legacyMappings = @{
    DATABASE_NAME     = 'MYSQL_DATABASE'
    DATABASE_USER     = 'MYSQL_USER'
    DATABASE_PASSWORD = 'MYSQL_PASSWORD'
  }
  foreach ($target in $legacyMappings.Keys) {
    $current = [Environment]::GetEnvironmentVariable($target, 'Process')
    $legacy = [Environment]::GetEnvironmentVariable($legacyMappings[$target], 'Process')
    if ([string]::IsNullOrWhiteSpace($current) -and -not [string]::IsNullOrWhiteSpace($legacy)) {
      [Environment]::SetEnvironmentVariable($target, $legacy, 'Process')
    }
  }

  if (
    [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable('DATABASE_HOST', 'Process')) -and
    -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable('MYSQL_DATABASE', 'Process'))
  ) {
    [Environment]::SetEnvironmentVariable('DATABASE_HOST', '127.0.0.1', 'Process')
  }
  if (
    [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable('DATABASE_PORT', 'Process')) -and
    -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable('MYSQL_DATABASE', 'Process'))
  ) {
    [Environment]::SetEnvironmentVariable('DATABASE_PORT', '13306', 'Process')
  }
}

function Assert-ProjectEnv {
  param([Parameter(Mandatory)][string[]]$Names)

  foreach ($name in $Names) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, 'Process'))) {
      throw "Required environment variable is missing: $name"
    }
  }
}

function Invoke-ProjectCommand {
  param(
    [Parameter(Mandatory)][string]$FilePath,
    [Parameter(Mandatory)][string[]]$ArgumentList
  )

  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath failed with exit code $LASTEXITCODE"
  }
}

function Test-ProjectEndpoint {
  param(
    [Parameter(Mandatory)][string]$Uri,
    [int]$TimeoutSec = 2
  )

  try {
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec $TimeoutSec
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch {
    return $false
  }
}
