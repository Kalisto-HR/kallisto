param(
    [string]$ClientDb = "client_db",
    [string]$AdminDb = "admin_db",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$PsqlPath = "",
    [switch]$SkipClient,
    [switch]$SkipAdmin
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

function Invoke-MigrationFile {
    param(
        [Parameter(Mandatory = $true)][string]$ResolvedPsqlPath,
        [Parameter(Mandatory = $true)][string]$Database,
        [Parameter(Mandatory = $true)][string]$FilePath
    )

    if (-not (Test-Path -LiteralPath $FilePath)) {
        throw "Migration file not found: $FilePath"
    }

    Write-Host "Applying migration to ${Database}: $(Split-Path -Leaf $FilePath)"
    & $ResolvedPsqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $Database -f $FilePath
    if ($LASTEXITCODE -ne 0) {
        throw "Migration failed for '$Database' on file '$FilePath'."
    }
}

if ($SkipClient -and $SkipAdmin) {
    Write-Host "Both -SkipClient and -SkipAdmin were provided. Nothing to do."
    exit 0
}

$migrationRoot = Join-Path $PSScriptRoot "..\migrations"
$migrationRoot = [System.IO.Path]::GetFullPath($migrationRoot)
$psqlPath = Resolve-PsqlCommand -PsqlPath $PsqlPath

if (-not $SkipClient) {
    Invoke-MigrationFile -ResolvedPsqlPath $psqlPath -Database $ClientDb -FilePath (Join-Path $migrationRoot "client_db.sql")
}

if (-not $SkipAdmin) {
    Invoke-MigrationFile -ResolvedPsqlPath $psqlPath -Database $AdminDb -FilePath (Join-Path $migrationRoot "admin_db.sql")
}

Write-Host "Migration apply complete."
