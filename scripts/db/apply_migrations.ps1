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
        [Parameter(Mandatory = $true)][string]$PsqlPath,
        [Parameter(Mandatory = $true)][string]$Database,
        [Parameter(Mandatory = $true)][string]$FilePath
    )

    if (-not (Test-Path -LiteralPath $FilePath)) {
        throw "Migration file not found: $FilePath"
    }

    Write-Host "Applying migration to ${Database}: $(Split-Path -Leaf $FilePath)"
    & $PsqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $Database -f $FilePath
    if ($LASTEXITCODE -ne 0) {
        throw "Migration failed for '$Database' on file '$FilePath'."
    }
}

$migrationRoot = Join-Path $PSScriptRoot "..\migrations"
$migrationRoot = [System.IO.Path]::GetFullPath($migrationRoot)

if ($SkipClient -and $SkipAdmin) {
    Write-Host "Both -SkipClient and -SkipAdmin were provided. Nothing to do."
    exit 0
}

$clientMigrations = @(
    "client_db.sql",
    "client_db_v2_university_compare.sql",
    "client_db_v2_application_transcripts.sql",
    "client_db_v3_application_files.sql",
    "client_db_v4_profile_test_scores.sql",
    "client_db_v5_application_test_scores.sql"
)

$adminMigrations = @(
    "admin_db.sql",
    "admin_db_v2_university_fields.sql",
    "admin_db_v3_superuser_global.sql",
    "admin_db_v4_manager_portal.sql",
    "admin_db_v5_partner_link_backfill.sql",
    "admin_db_v6_submitted_application_files.sql"
)

$psqlPath = Resolve-PsqlCommand -PsqlPath $PsqlPath

if (-not $SkipClient) {
    foreach ($file in $clientMigrations) {
        $path = Join-Path $migrationRoot $file
        Invoke-MigrationFile -PsqlPath $psqlPath -Database $ClientDb -FilePath $path
    }
}

if (-not $SkipAdmin) {
    foreach ($file in $adminMigrations) {
        $path = Join-Path $migrationRoot $file
        Invoke-MigrationFile -PsqlPath $psqlPath -Database $AdminDb -FilePath $path
    }
}

Write-Host "Migration apply complete."
