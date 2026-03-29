param(
    [Alias("AdminDb")]
    [string]$Database = "admin_db",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$PsqlPath = "",
    [string]$DataFile = "",
    [string]$DatabaseUrl = "",
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-ConnectionString {
    param(
        [string]$ExplicitUrl,
        [string]$DbName,
        [string]$User,
        [string]$Host,
        [int]$Port
    )

    if (-not [string]::IsNullOrWhiteSpace($ExplicitUrl)) {
        return $ExplicitUrl
    }

    if (-not [string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
        return $env:DATABASE_URL
    }

    $parts = @(
        "host=$Host",
        "port=$Port",
        "user=$User",
        "dbname=$DbName"
    )
    if (-not [string]::IsNullOrWhiteSpace($env:PGPASSWORD)) {
        $parts += "password=$($env:PGPASSWORD)"
    }
    return ($parts -join " ")
}

$resolvedDataFile = if ([string]::IsNullOrWhiteSpace($DataFile)) {
    Join-Path $PSScriptRoot "data\universities.v1.json"
} else {
    $DataFile
}

if (-not (Test-Path -LiteralPath $resolvedDataFile)) {
    throw "Seed data file not found: $resolvedDataFile"
}

$resolvedDatabaseUrl = Resolve-ConnectionString -ExplicitUrl $DatabaseUrl -DbName $Database -User $DbUser -Host $DbHost -Port $DbPort
if ([string]::IsNullOrWhiteSpace($resolvedDatabaseUrl)) {
    throw "A database connection string is required. Set DATABASE_URL or pass -DatabaseUrl."
}

if ($DryRun) {
    $universities = Get-Content -LiteralPath $resolvedDataFile -Raw | ConvertFrom-Json
    if (-not $universities) {
        throw "No universities were loaded from $resolvedDataFile"
    }
    Write-Host "Dry run successful."
    Write-Host "Parsed universities: $($universities.Count)"
    Write-Host "Target database: $Database"
    exit 0
}

$repoRoot = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
$command = @(
    "run",
    ".\scripts\seeds\cmd\import_universities\main.go",
    "--data", $resolvedDataFile,
    "--database-url", $resolvedDatabaseUrl
)

Push-Location $repoRoot
try {
    & go @command
    if ($LASTEXITCODE -ne 0) {
        throw "University seed import failed."
    }
}
finally {
    Pop-Location
}
