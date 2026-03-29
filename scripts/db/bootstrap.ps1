param(
    [Alias("AdminDb")]
    [string]$Database = "admin_db",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$PsqlPath = "",
    [ValidateSet("dev", "staging", "none")]
    [string]$SeedProfile = "dev",
    [switch]$CreateDatabases,
    [switch]$SkipSeeds
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

function Test-DatabaseExists {
    param(
        [Parameter(Mandatory = $true)][string]$PsqlPath,
        [Parameter(Mandatory = $true)][string]$DbName
    )

    $query = "SELECT 1 FROM pg_database WHERE datname = '$DbName';"
    $result = & $PsqlPath -t -A -h $DbHost -p $DbPort -U $DbUser -d postgres -c $query
    if ($LASTEXITCODE -ne 0) {
        throw "Failed checking database existence for '$DbName'."
    }
    return (($result | Out-String).Trim() -eq "1")
}

function Ensure-DatabaseExists {
    param(
        [Parameter(Mandatory = $true)][string]$PsqlPath,
        [Parameter(Mandatory = $true)][string]$DbName
    )

    if (Test-DatabaseExists -PsqlPath $PsqlPath -DbName $DbName) {
        Write-Host "Database already exists: $DbName"
        return
    }

    Write-Host "Creating database: $DbName"
    & $PsqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE `"$DbName`";"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed creating database '$DbName'."
    }
}

$psqlPath = Resolve-PsqlCommand -PsqlPath $PsqlPath

if ($CreateDatabases) {
    Ensure-DatabaseExists -PsqlPath $psqlPath -DbName $Database
}

$applyMigrations = Join-Path $PSScriptRoot "apply_migrations.ps1"
& $applyMigrations -Database $Database -DbUser $DbUser -DbHost $DbHost -DbPort $DbPort -PsqlPath $PsqlPath
if ($LASTEXITCODE -ne 0) {
    throw "Migration apply failed."
}

if (-not $SkipSeeds) {
    $applySeeds = Join-Path $PSScriptRoot "apply_seeds.ps1"
    & $applySeeds -SeedProfile $SeedProfile -Database $Database -DbUser $DbUser -DbHost $DbHost -DbPort $DbPort -PsqlPath $PsqlPath
    if ($LASTEXITCODE -ne 0) {
        throw "Seed apply failed."
    }
}

Write-Host "Bootstrap complete."
