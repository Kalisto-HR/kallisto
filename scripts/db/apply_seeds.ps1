param(
    [ValidateSet("dev", "staging", "none")]
    [string]$SeedProfile = "dev",
    [string]$ClientDb = "client_db",
    [string]$AdminDb = "admin_db",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$PsqlPath = "",
    [switch]$SkipUniversities
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

function Invoke-PsqlFile {
    param(
        [Parameter(Mandatory = $true)][string]$PsqlPath,
        [Parameter(Mandatory = $true)][string]$Database,
        [Parameter(Mandatory = $true)][string]$FilePath
    )

    if (-not (Test-Path -LiteralPath $FilePath)) {
        throw "Seed file not found: $FilePath"
    }

    Write-Host "Applying seed to ${Database}: $(Split-Path -Leaf $FilePath)"
    & $PsqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $Database -f $FilePath
    if ($LASTEXITCODE -ne 0) {
        throw "Seed failed for '$Database' on file '$FilePath'."
    }
}

function Invoke-UniversitySeed {
    param(
        [Parameter(Mandatory = $true)][string]$ClientDbName,
        [Parameter(Mandatory = $true)][string]$AdminDbName,
        [Parameter(Mandatory = $true)][string]$ResolvedPsqlPath
    )

    $scriptPath = Join-Path $PSScriptRoot "..\seeds\import_universities.ps1"
    $scriptPath = [System.IO.Path]::GetFullPath($scriptPath)
    if (-not (Test-Path -LiteralPath $scriptPath)) {
        throw "University seed script not found: $scriptPath"
    }

    Write-Host "Seeding universities dataset into $ClientDbName and $AdminDbName"
    & $scriptPath -ClientDb $ClientDbName -AdminDb $AdminDbName -DbUser $DbUser -DbHost $DbHost -DbPort $DbPort -PsqlPath $ResolvedPsqlPath
    if ($LASTEXITCODE -ne 0) {
        throw "University seed script failed."
    }
}

if ($SeedProfile -eq "none") {
    Write-Host "Seed profile 'none' selected. Skipping all seed operations."
    exit 0
}

$psqlPath = Resolve-PsqlCommand -PsqlPath $PsqlPath
$seedRoot = Join-Path $PSScriptRoot "..\seeds"
$seedRoot = [System.IO.Path]::GetFullPath($seedRoot)

if (-not $SkipUniversities) {
    Invoke-UniversitySeed -ClientDbName $ClientDb -AdminDbName $AdminDb -ResolvedPsqlPath $psqlPath
}

switch ($SeedProfile) {
    "dev" {
        Invoke-PsqlFile -PsqlPath $psqlPath -Database $AdminDb -FilePath (Join-Path $seedRoot "admin_seed.sql")
    }
    "staging" {
        Invoke-PsqlFile -PsqlPath $psqlPath -Database $AdminDb -FilePath (Join-Path $seedRoot "admin_seed_staging.sql")
    }
}

Write-Host "Seed apply complete. Profile: $SeedProfile"
