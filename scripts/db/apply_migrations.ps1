param(
    [Alias("AdminDb")]
    [string]$Database = "admin_db",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$PsqlPath = ""
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

$migrationRoot = Join-Path $PSScriptRoot "..\migrations"
$migrationRoot = [System.IO.Path]::GetFullPath($migrationRoot)
$psqlPath = Resolve-PsqlCommand -PsqlPath $PsqlPath

$migrationFiles = @(
    "admin_db.sql",
    "20260329_current_state_contracts.sql",
    "20260329_drop_legacy_single_db_scaffolding.sql"
)

foreach ($migrationFile in $migrationFiles) {
    Invoke-MigrationFile -ResolvedPsqlPath $psqlPath -Database $Database -FilePath (Join-Path $migrationRoot $migrationFile)
}

Write-Host "Migration apply complete."
